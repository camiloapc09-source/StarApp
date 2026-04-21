import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

// PATCH /api/payments/[id] — admin confirms payment (full or partial)
// Body: { paymentMethod?: string, paidAmount?: number }
// If paidAmount < payment.amount → splits: closes current for paidAmount, creates PENDING for remainder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paymentMethod: string | null = body.paymentMethod ?? null;
  const paidAmount: number | null     = typeof body.paidAmount === "number" ? body.paidAmount : null;

  const existing = await db.payment.findUnique({
    where: { id },
    select: { clubId: true, amount: true, concept: true, dueDate: true, playerId: true },
  });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const isPartial = paidAmount !== null && paidAmount > 0 && paidAmount < existing.amount;
  const effectiveAmount = isPartial ? paidAmount : existing.amount;

  const payment = await db.payment.update({
    where: { id },
    data: {
      status:        "COMPLETED",
      paidAt:        new Date(),
      proofUrl:      null,
      amount:        effectiveAmount,
      proofNote:     isPartial ? `Abono parcial. Saldo pendiente: $${(existing.amount - effectiveAmount).toLocaleString("es-CO")}` : null,
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    include: {
      player: {
        select: {
          id: true, userId: true, paymentDay: true, monthlyAmount: true,
          payments: {
            where: { status: { in: ["PENDING", "OVERDUE"] } },
            orderBy: { dueDate: "desc" },
            take: 1,
          },
          user: { select: { name: true } },
        },
      },
    },
  });

  // If partial: create a new PENDING for the remaining balance
  let balancePaymentId: string | null = null;
  if (isPartial) {
    const remaining = existing.amount - effectiveAmount;
    const balance = await db.payment.create({
      data: {
        clubId,
        playerId: existing.playerId,
        amount:   remaining,
        concept:  `Saldo pendiente — ${existing.concept}`,
        status:   "PENDING",
        dueDate:  existing.dueDate,
      },
    });
    balancePaymentId = balance.id;
  }

  // Notify player
  const notifMsg = isPartial
    ? `Se registró un abono de $${effectiveAmount.toLocaleString("es-CO")} por "${existing.concept}". Saldo pendiente: $${(existing.amount - effectiveAmount).toLocaleString("es-CO")}.`
    : `Tu pago de $${effectiveAmount.toLocaleString("es-CO")} por "${payment.concept}" fue confirmado.`;

  await db.notification.create({
    data: {
      userId:  payment.player.userId,
      title:   isPartial ? "Abono registrado ✓" : "Pago confirmado ✓",
      message: notifMsg,
      type:    "PAYMENT",
    },
  });

  // Auto-generate next month only on full payment
  if (!isPartial) {
    try {
      const lastPending = payment.player.payments[0];
      const paymentDay  = payment.player.paymentDay ?? new Date(payment.dueDate).getDate();
      const prevDue     = new Date(payment.dueDate);
      const nextMonth   = prevDue.getMonth() + 1;
      const nextYear    = prevDue.getFullYear() + (nextMonth > 11 ? 1 : 0);
      const month       = nextMonth % 12;
      const lastDay     = new Date(nextYear, month + 1, 0).getDate();
      const nextDue     = new Date(nextYear, month, Math.min(paymentDay, lastDay));

      const alreadyExists = lastPending && new Date(lastPending.dueDate) >= nextDue;

      if (!alreadyExists) {
        const periodEnd  = new Date(nextYear, month + 1, Math.min(paymentDay, new Date(nextYear, month + 2, 0).getDate()) - 1);
        const periodLabel = `${nextDue.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;
        const nextAmount  = payment.player.monthlyAmount ?? payment.amount;

        await db.payment.create({
          data: {
            clubId,
            playerId: payment.player.id,
            amount:   nextAmount,
            concept:  `Mensualidad ${periodLabel}`,
            status:   "PENDING",
            dueDate:  nextDue,
          },
        });
      }
    } catch (e) {
      console.error("Failed to auto-generate next payment", e);
    }
  }

  return apiOk({ ...payment, balancePaymentId });
}
