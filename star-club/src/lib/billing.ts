import { db } from "@/lib/db";

const OPEN_STATUSES = ["PENDING", "OVERDUE", "SUBMITTED"] as const;

/**
 * Genera, si corresponde, el cobro mensual del SIGUIENTE mes para un jugador.
 *
 * Se llama tras confirmar un pago (individual o masivo). Reglas:
 *  - No genera si el jugador tiene beca 100% o mensualidad en 0 (no debe pagar).
 *  - No genera si el jugador aún tiene algún cobro abierto (PENDING/OVERDUE/SUBMITTED):
 *    primero debe ponerse al día; el siguiente mes se crea cuando quede en cero.
 *  - Toma el cobro con la fecha de vencimiento más reciente y crea el del mes siguiente,
 *    salvo que ya exista uno para ese mes o posterior (idempotente).
 *
 * Devuelve el id del pago creado, o null si no se generó nada.
 */
export async function ensureNextMonthlyPayment(
  playerId: string,
  fallbackAmount?: number,
): Promise<string | null> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      clubId: true,
      monthlyAmount: true,
      paymentDay: true,
      scholarshipPct: true,
      payments: { select: { dueDate: true, status: true } },
    },
  });
  if (!player) return null;

  if ((player.scholarshipPct ?? 0) === 100) return null;

  const amount =
    player.monthlyAmount && player.monthlyAmount > 0
      ? player.monthlyAmount
      : fallbackAmount && fallbackAmount > 0
        ? fallbackAmount
        : 0;
  if (amount <= 0) return null;

  if (player.payments.length === 0) return null;

  // Si aún debe algo, no adelantar el siguiente mes.
  const hasOpen = player.payments.some((p) =>
    (OPEN_STATUSES as readonly string[]).includes(p.status),
  );
  if (hasOpen) return null;

  // Vencimiento más reciente entre todos sus cobros.
  const latestDue = player.payments.reduce(
    (max, p) => (new Date(p.dueDate) > new Date(max) ? p.dueDate : max),
    player.payments[0].dueDate,
  );

  const prevDue = new Date(latestDue);
  const paymentDay = player.paymentDay ?? prevDue.getDate();
  const rawMonth = prevDue.getMonth() + 1;
  const nextYear = prevDue.getFullYear() + (rawMonth > 11 ? 1 : 0);
  const month = rawMonth % 12;
  const lastDay = new Date(nextYear, month + 1, 0).getDate();
  const nextDue = new Date(nextYear, month, Math.min(paymentDay, lastDay));

  // ¿Ya existe un cobro para ese mes o uno posterior?
  const alreadyExists = player.payments.some((p) => new Date(p.dueDate) >= nextDue);
  if (alreadyExists) return null;

  const periodEndLastDay = new Date(nextYear, month + 2, 0).getDate();
  const periodEnd = new Date(nextYear, month + 1, Math.min(paymentDay, periodEndLastDay) - 1);
  const periodLabel = `${nextDue.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

  const created = await db.payment.create({
    data: {
      clubId: player.clubId,
      playerId: player.id,
      amount,
      concept: `Mensualidad ${periodLabel}`,
      status: "PENDING",
      dueDate: nextDue,
    },
  });
  return created.id;
}
