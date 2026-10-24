/**
 * Promesas de pago — recordatorio único el día prometido.
 *
 * FILOSOFÍA: no ser invasivo. El acudiente recibe UN solo aviso, el día que él
 * mismo dijo que pagaba, y solo si el cobro sigue abierto. Si ya pagó, subió el
 * comprobante, no vino ("No vino" lo cierra) o el deportista está inactivo,
 * no sale nada.
 *
 * CANALES
 *   • En la app: notificación + push (siempre).
 *   • WhatsApp: si `GHL_PROMISE_WEBHOOK_URL` está definida, se envía a un
 *     workflow de GoHighLevel que manda la plantilla aprobada. Sin esa
 *     variable, solo se avisa dentro de la app.
 */

import { db } from "@/lib/db";
import { clubToday } from "@/lib/dates";
import { resolveContact } from "@/lib/phone";
import { sendPushToUser } from "@/lib/push";

export interface PromiseRunResult {
  due: number;
  reminded: number;
  skipped: number;
  whatsappSent: number;
}

/** Cobros aún abiertos cuya promesa vence hoy y todavía no se recordó. */
export async function runPromiseReminders(clubId: string | null): Promise<PromiseRunResult> {
  const result: PromiseRunResult = { due: 0, reminded: 0, skipped: 0, whatsappSent: 0 };

  const today = clubToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const payments = await db.payment.findMany({
    where: {
      ...(clubId ? { clubId } : {}),
      status: { in: ["PENDING", "OVERDUE"] },
      promisedDate: { gte: today, lt: tomorrow },
      promiseRemindedAt: null,
    },
    select: {
      id: true, amount: true, concept: true, clubId: true, promisedDate: true,
      club: { select: { name: true, country: true } },
      player: {
        select: {
          status: true, paymentExempt: true, scholarshipPct: true, phone: true,
          user: { select: { name: true, phone: true } },
          parentLinks: {
            select: {
              parent: {
                select: { phone: true, relation: true, userId: true, user: { select: { name: true, phone: true } } },
              },
            },
          },
        },
      },
    },
  });
  result.due = payments.length;

  const webhook = process.env.GHL_PROMISE_WEBHOOK_URL;

  for (const p of payments) {
    const pl = p.player;
    // No se le cobra a quien ya no entrena, a los exentos ni a becas del 100 %.
    if (pl.status === "INACTIVE" || pl.paymentExempt || (pl.scholarshipPct ?? 0) >= 100) {
      result.skipped++;
      continue;
    }

    const money = `$${p.amount.toLocaleString("es-CO")}`;
    const title = "Hoy es el día de tu pago 🙏";
    const message = `Hoy quedamos en el pago de ${money} por "${p.concept}" de ${pl.user.name}. ¡Gracias!`;
    const link = `/dashboard/parent/payments?p=${p.id}&r=promise`;

    const parentUserIds = pl.parentLinks.map((l) => l.parent.userId).filter(Boolean) as string[];
    if (parentUserIds.length > 0) {
      await db.notification.createMany({
        data: parentUserIds.map((userId) => ({ userId, title, message, type: "PAYMENT", link })),
      });
      await Promise.allSettled(
        parentUserIds.map((userId) => sendPushToUser(userId, { title, body: message, url: link })),
      );
    }

    if (webhook) {
      const contact = resolveContact(pl, p.club.country);
      if (contact.digits) {
        try {
          const res = await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: `+${contact.digits}`,
              parentName: contact.name,
              playerName: pl.user.name,
              amount: p.amount,
              concept: p.concept,
              clubName: p.club.name,
              promisedDate: p.promisedDate?.toISOString().slice(0, 10),
            }),
          });
          if (res.ok) result.whatsappSent++;
        } catch {
          // Un fallo de red no debe impedir marcar el aviso en la app.
        }
      }
    }

    await db.payment.update({ where: { id: p.id }, data: { promiseRemindedAt: new Date() } });
    result.reminded++;
  }

  return result;
}
