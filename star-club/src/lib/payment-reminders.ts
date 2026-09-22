/**
 * Vencidos y recordatorios de pago — servicio único.
 *
 * QUÉ REEMPLAZA
 * ─────────────
 * Antes esta lógica vivía DUPLICADA en dos sitios, y con comportamientos
 * distintos:
 *
 *   • `/dashboard/admin/payments` (al renderizar la página): marcaba vencidos y
 *     creaba notificaciones, pero NO enviaba push ni correo. Además hacía un
 *     `findFirst` por cada pago y por cada usuario, en serie — 200+ consultas
 *     por carga con 100 alumnos. Y se disparaba cada vez que el admin entraba.
 *
 *   • `/api/payments/mark-overdue` (botón manual): sí enviaba push y correo.
 *
 * Resultado: si el admin no abría la página, nadie se enteraba de nada.
 *
 * Ahora hay una sola función, la ejecuta el cron diario, y la página solo LEE.
 *
 * DOS CAMBIOS DE FONDO
 * ────────────────────
 *  1. Un cobro se marca vencido cuando TERMINA su día de vencimiento en hora
 *     Colombia (`overdueCutoff`), no a las 00:00 del mismo día. Antes un cobro
 *     que vencía hoy salía en rojo desde las 7 p.m. del día anterior.
 *
 *  2. La deduplicación de notificaciones se hace con DOS consultas en total, no
 *     con una por usuario. La clave va embebida en `link`.
 */

import { db } from "@/lib/db";
import { overdueCutoff, clubCalendarParts, CLUB_TIMEZONE } from "@/lib/dates";
import { sendOverduePaymentEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

/** Días de antelación con que avisamos que un pago está por vencer. */
const REMINDER_DAYS = 3;

/** Ventana en la que consideramos que ya se avisó y no hay que repetir. */
const DEDUPE_WINDOW_DAYS = 20;

type ReminderKind = "overdue" | "due-soon";

/**
 * El `link` de la notificación hace doble trabajo: lleva al acudiente a la
 * pantalla correcta y a la vez nos sirve de clave para no repetir el aviso.
 */
function notificationLink(kind: ReminderKind, paymentId: string): string {
  return `/dashboard/parent/payments?p=${paymentId}&r=${kind}`;
}

function dedupeKey(userId: string, kind: ReminderKind, paymentId: string): string {
  return `${userId}|${kind}|${paymentId}`;
}

/** Reconstruye la clave a partir de un `link` ya guardado. */
function keyFromLink(userId: string, link: string | null): string | null {
  if (!link) return null;
  const paymentId = /[?&]p=([^&]+)/.exec(link)?.[1];
  const kind = /[?&]r=([^&]+)/.exec(link)?.[1];
  if (!paymentId || !kind) return null;
  return dedupeKey(userId, kind as ReminderKind, paymentId);
}

export interface ReminderResult {
  markedOverdue: number;
  /** Cobros que estaban en OVERDUE sin estarlo de verdad y se devolvieron a PENDING. */
  unmarkedOverdue: number;
  overdueNotified: number;
  dueSoonNotified: number;
  emailsSent: number;
}

/**
 * Ejecuta el ciclo completo para un club (o para todos si `clubId` es null).
 *
 * @param opts.notify  `false` solo marca vencidos, sin avisar a nadie. Lo usa
 *                     la página del admin como red de seguridad si el cron no
 *                     corrió, sin llenar de notificaciones repetidas.
 */
export async function runPaymentReminders(
  clubId: string | null,
  opts: { notify?: boolean } = {},
): Promise<ReminderResult> {
  const notify = opts.notify ?? true;
  const result: ReminderResult = {
    markedOverdue: 0, unmarkedOverdue: 0, overdueNotified: 0, dueSoonNotified: 0, emailsSent: 0,
  };

  const clubFilter = clubId ? { clubId } : {};
  const cutoff = overdueCutoff(CLUB_TIMEZONE);

  // ── 0. Reparar los que se marcaron vencidos antes de tiempo ────────────────
  // El barrido viejo usaba `dueDate < now` con la hora incluida, así que un
  // cobro que vencía HOY entraba en OVERDUE desde las 00:00 — y desde las
  // 7 p.m. del día anterior en hora Colombia, porque el servidor corre en UTC.
  // Estos vuelven a PENDING: todavía están a tiempo.
  const restored = await db.payment.updateMany({
    where: { ...clubFilter, status: "OVERDUE", dueDate: { gte: cutoff } },
    data: { status: "PENDING" },
  });
  result.unmarkedOverdue = restored.count;

  // ── 1. Marcar como vencidos los cobros cuyo día de vencimiento YA TERMINÓ ──
  const toMark = await db.payment.findMany({
    where: { ...clubFilter, status: "PENDING", dueDate: { lt: cutoff } },
    select: { id: true, playerId: true, concept: true, amount: true, dueDate: true, clubId: true },
  });

  if (toMark.length > 0) {
    await db.payment.updateMany({
      where: { id: { in: toMark.map((p) => p.id) } },
      data: { status: "OVERDUE" },
    });
    result.markedOverdue = toMark.length;
  }

  // Modo "solo sincronizar": corrige estados y no molesta a nadie.
  if (!notify) return result;

  // ── 2. Cobros próximos a vencer (dentro de REMINDER_DAYS) ──────────────────
  const soonFrom = new Date(cutoff);
  const soonTo = new Date(cutoff);
  soonTo.setDate(soonTo.getDate() + REMINDER_DAYS + 1);

  const dueSoon = await db.payment.findMany({
    where: { ...clubFilter, status: "PENDING", dueDate: { gte: soonFrom, lt: soonTo } },
    select: { id: true, playerId: true, concept: true, amount: true, dueDate: true, clubId: true },
  });

  const allPayments = [
    ...toMark.map((p) => ({ ...p, kind: "overdue" as ReminderKind })),
    ...dueSoon.map((p) => ({ ...p, kind: "due-soon" as ReminderKind })),
  ];
  if (allPayments.length === 0) return result;

  // ── 3. UNA consulta para todos los destinatarios ───────────────────────────
  const playerIds = [...new Set(allPayments.map((p) => p.playerId))];
  const players = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      userId: true,
      user: { select: { name: true } },
      parentLinks: {
        select: { parent: { select: { userId: true, user: { select: { name: true, email: true } } } } },
      },
    },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // ── 4. UNA consulta para saber qué ya se avisó ─────────────────────────────
  const recipientIds = [...new Set(players.flatMap((p) => [
    p.userId, ...p.parentLinks.map((l) => l.parent.userId),
  ]))];

  const since = new Date();
  since.setDate(since.getDate() - DEDUPE_WINDOW_DAYS);

  const existing = await db.notification.findMany({
    where: { userId: { in: recipientIds }, type: "PAYMENT", createdAt: { gte: since } },
    select: { userId: true, link: true },
  });
  const alreadySent = new Set(
    existing.map((n) => keyFromLink(n.userId, n.link)).filter((k): k is string => k !== null),
  );

  // ── 5. Armar todo en memoria y escribir de una sola vez ────────────────────
  const clubIds = [...new Set(allPayments.map((p) => p.clubId))];
  const clubs = await db.club.findMany({
    where: { id: { in: clubIds } },
    select: { id: true, name: true },
  });
  const clubNames = new Map(clubs.map((c) => [c.id, c.name]));
  const appUrl = process.env.NEXTAUTH_URL ?? "https://starapp-9qb7.onrender.com";

  const newNotifications: Array<{
    userId: string; title: string; message: string; type: string; link: string;
  }> = [];
  const pushJobs: Array<{ userId: string; title: string; body: string; url: string }> = [];
  const emailJobs: Array<Parameters<typeof sendOverduePaymentEmail>[0]> = [];

  for (const payment of allPayments) {
    const player = playerMap.get(payment.playerId);
    if (!player) continue;

    const isOverdue = payment.kind === "overdue";
    const money = `$${payment.amount.toLocaleString("es-CO")}`;
    const daysLeft = Math.round(
      (new Date(payment.dueDate).getTime() - cutoff.getTime()) / 86_400_000,
    );

    const title = isOverdue
      ? "Pago vencido ⚠️"
      : daysLeft === 0
        ? "Tu pago vence hoy ⏰"
        : `Tu pago vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""} ⏰`;

    const message = isOverdue
      ? `Tu pago de ${money} por "${payment.concept}" está vencido.`
      : `El pago de ${money} por "${payment.concept}" ${daysLeft === 0 ? "vence hoy" : `vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`}.`;

    const link = notificationLink(payment.kind, payment.id);

    const targets = [
      { userId: player.userId, email: null as string | null, name: player.user.name },
      ...player.parentLinks.map((l) => ({
        userId: l.parent.userId,
        email: l.parent.user.email,
        name: l.parent.user.name,
      })),
    ];

    for (const target of targets) {
      if (!target.userId) continue;
      const key = dedupeKey(target.userId, payment.kind, payment.id);
      if (alreadySent.has(key)) continue;
      alreadySent.add(key); // evita duplicar dentro de esta misma corrida

      newNotifications.push({ userId: target.userId, title, message, type: "PAYMENT", link });
      pushJobs.push({ userId: target.userId, title, body: `${money} — ${payment.concept}`, url: link });

      // El correo solo al acudiente, y solo cuando ya está vencido.
      if (isOverdue && target.email) {
        emailJobs.push({
          to: target.email,
          parentName: target.name ?? "",
          playerName: player.user.name,
          concept: payment.concept,
          amountCOP: payment.amount,
          clubName: clubNames.get(payment.clubId) ?? "el club",
          appUrl,
        });
      }

      if (isOverdue) result.overdueNotified++;
      else result.dueSoonNotified++;
    }
  }

  if (newNotifications.length > 0) {
    await db.notification.createMany({ data: newNotifications });
  }

  // Push y correo en paralelo — no bloquean entre sí ni se abortan unos a otros.
  await Promise.allSettled([
    ...pushJobs.map((j) => sendPushToUser(j.userId, { title: j.title, body: j.body, url: j.url })),
    ...emailJobs.map((j) => sendOverduePaymentEmail(j)),
  ]);
  result.emailsSent = emailJobs.length;

  return result;
}

/**
 * Versión ligera para la página del admin: solo corrige estados, sin notificar.
 * Es una red de seguridad por si el cron no corrió; la página nunca debe ser
 * la que dispara correos.
 */
export async function syncOverdueStatuses(clubId: string): Promise<number> {
  const { markedOverdue } = await runPaymentReminders(clubId, { notify: false });
  return markedOverdue;
}

/**
 * Corrige el `paymentDay` de los deportistas cuya fecha de ingreso se guardó
 * corrida un día por el bug de zona horaria.
 *
 * `new Date("2026-09-22")` se leía como medianoche UTC, que en Colombia es el
 * 21 a las 7 p.m., así que `.getDate()` devolvía 21. A quien se activó el 22 le
 * quedó día de pago 21, y todas sus mensualidades vencen un día antes.
 *
 * @param apply  `false` (por defecto) solo reporta qué cambiaría, sin escribir.
 */
export async function repairShiftedPaymentDays(
  clubId: string | null,
  apply = false,
): Promise<Array<{ playerId: string; name: string; from: number | null; to: number }>> {
  const players = await db.player.findMany({
    where: { ...(clubId ? { clubId } : {}), joinDate: { not: null } },
    select: { id: true, paymentDay: true, joinDate: true, user: { select: { name: true } } },
  });

  const fixes: Array<{ playerId: string; name: string; from: number | null; to: number }> = [];

  for (const p of players) {
    if (!p.joinDate) continue;
    // El día correcto es el que se ve en el calendario del club.
    const { day } = clubCalendarParts(p.joinDate, CLUB_TIMEZONE);
    if (p.paymentDay === day) continue;
    // Solo corregimos el desfase de exactamente un día: cualquier otra
    // diferencia es un día de pago que el admin puso a propósito.
    const shifted = p.paymentDay !== null && Math.abs(p.paymentDay - day) === 1;
    if (!shifted) continue;
    fixes.push({ playerId: p.id, name: p.user.name, from: p.paymentDay, to: day });
  }

  if (apply) {
    for (const fix of fixes) {
      await db.player.update({ where: { id: fix.playerId }, data: { paymentDay: fix.to } });
    }
  }

  return fixes;
}
