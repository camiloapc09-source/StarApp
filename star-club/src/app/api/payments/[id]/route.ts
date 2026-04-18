import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

// PATCH /api/payments/[id] — admin confirms payment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paymentMethod = body.paymentMethod ?? null;

  const existing = await db.payment.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const payment = await db.payment.update({
    where: { id },
    data: {
      status: "COMPLETED",
      paidAt: new Date(),
      proofUrl: null,
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    include: {
      player: {
        select: {
          id: true, userId: true, paymentDay: true,
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

  await db.notification.create({
    data: {
      userId: payment.player.userId,
      title: "Pago confirmado ✓",
      message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" fue confirmado.`,
      type: "PAYMENT",
    },
  });

  try {
    const lastPending = payment.player.payments[0];
    const paymentDay = payment.player.paymentDay ?? new Date(payment.dueDate).getDate();
    const prevDue = new Date(payment.dueDate);
    const nextMonth = prevDue.getMonth() + 1;
    const nextYear = prevDue.getFullYear() + (nextMonth > 11 ? 1 : 0);
    const month = nextMonth % 12;
    const lastDay = new Date(nextYear, month + 1, 0).getDate();
    const nextDue = new Date(nextYear, month, Math.min(paymentDay, lastDay));

    const alreadyExists = lastPending && new Date(lastPending.dueDate) >= nextDue;

    if (!alreadyExists) {
      const periodEnd = new Date(nextYear, month + 1, Math.min(paymentDay, new Date(nextYear, month + 2, 0).getDate()) - 1);
      const periodLabel = `${nextDue.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

      await db.payment.create({
        data: {
          clubId,
          playerId: payment.player.id,
          amount: payment.amount,
          concept: `Mensualidad ${periodLabel}`,
          status: "PENDING",
          dueDate: nextDue,
        },
      });
    }
  } catch (e) {
    console.error("Failed to auto-generate next payment", e);
  }

  return apiOk(payment);
}
