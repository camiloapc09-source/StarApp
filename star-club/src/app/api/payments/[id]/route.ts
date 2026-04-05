import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/payments/[id] — admin confirms payment (from proof or cash)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paymentMethod = body.paymentMethod ?? null;

  const payment = await db.payment.update({
    where: { id },
    data: {
      status: "COMPLETED",
      paidAt: new Date(),
      ...(paymentMethod ? { paymentMethod } : {}),
    },
    include: {
      player: {
        select: {
          id: true,
          userId: true,
          paymentDay: true,
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

  // Notify player
  await db.notification.create({
    data: {
      userId: payment.player.userId,
      title: "Pago confirmado ✓",
      message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" fue confirmado.`,
      type: "PAYMENT",
    },
  });

  // Auto-generate next payment if there's no future pending payment
  try {
    const lastPending = payment.player.payments[0];
    const paymentDay = payment.player.paymentDay ?? new Date(payment.dueDate).getDate();

    // Next due date: one month after the confirmed payment's dueDate
    const prevDue = new Date(payment.dueDate);
    const nextMonth = prevDue.getMonth() + 1;
    const nextYear = prevDue.getFullYear() + (nextMonth > 11 ? 1 : 0);
    const month = nextMonth % 12;
    const lastDay = new Date(nextYear, month + 1, 0).getDate();
    const nextDue = new Date(nextYear, month, Math.min(paymentDay, lastDay));

    // Only create if no pending payment already exists for or after that date
    const alreadyExists = lastPending && new Date(lastPending.dueDate) >= nextDue;

    if (!alreadyExists) {
      const periodEnd = new Date(nextYear, month + 1, Math.min(paymentDay, new Date(nextYear, month + 2, 0).getDate()) - 1);
      const periodLabel = `${nextDue.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

      await db.payment.create({
        data: {
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

  return NextResponse.json(payment);
}

