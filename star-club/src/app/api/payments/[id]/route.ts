import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { ensureNextMonthlyPayment } from "@/lib/billing";

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
            where: { status: { in: ["PENDING", "OVERDUE", "SUBMITTED"] } },
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

  // Push al usuario del jugador
  await sendPushToUser(payment.player.userId, {
    title: isPartial ? "Abono registrado ✓" : "Pago confirmado ✓",
    body: `$${effectiveAmount.toLocaleString("es-CO")} por "${payment.concept}"`,
    url: "/dashboard/parent/payments",
  });

  // Email al padre — solo en pago completo
  if (!isPartial) {
    const playerWithParent = await db.player.findUnique({
      where: { id: existing.playerId },
      select: {
        user: { select: { name: true } },
        parentLinks: {
          take: 1,
          include: { parent: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
    });
    const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
    const parentLink = playerWithParent?.parentLinks[0]?.parent;
    if (parentLink?.user?.email) {
      await sendPaymentConfirmedEmail({
        to: parentLink.user.email,
        parentName: parentLink.user.name,
        playerName: playerWithParent?.user.name ?? "",
        concept: payment.concept,
        amountCOP: effectiveAmount,
        clubName: club?.name ?? "Star Club",
        appUrl: process.env.NEXTAUTH_URL ?? "https://starapp-9qb7.onrender.com",
      });
    }
  }

  // Auto-generate next month only on full payment
  if (!isPartial) {
    try {
      await ensureNextMonthlyPayment(existing.playerId, effectiveAmount);
    } catch (e) {
      console.error("Failed to auto-generate next payment", e);
    }
  }

  return apiOk({ ...payment, balancePaymentId });
}

// DELETE /api/payments/[id] — admin deletes a payment record
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;

  const existing = await db.payment.findUnique({
    where: { id },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  await db.payment.delete({ where: { id } });

  return apiOk({ deleted: true });
}
