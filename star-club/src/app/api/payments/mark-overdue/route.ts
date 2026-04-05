import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/payments/mark-overdue
// Marks all PENDING payments whose dueDate has passed as OVERDUE
// Can be called manually by admin or via a cron/periodic trigger
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  const overdue = await db.payment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    select: { id: true, playerId: true, concept: true, amount: true },
  });

  if (overdue.length === 0) {
    return NextResponse.json({ updated: 0, message: "No hay pagos pendientes vencidos." });
  }

  // Update all to OVERDUE
  await db.payment.updateMany({
    where: { id: { in: overdue.map((p) => p.id) } },
    data: { status: "OVERDUE" },
  });

  // Notify each player
  const playerIds = [...new Set(overdue.map((p) => p.playerId))];
  const players   = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, userId: true },
  });
  const userIdMap = Object.fromEntries(players.map((p) => [p.id, p.userId]));

  for (const payment of overdue) {
    const userId = userIdMap[payment.playerId];
    if (!userId) continue;
    await db.notification.create({
      data: {
        userId,
        title: "Pago vencido ⚠️",
        message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" está vencido. Comunícate con el club para regularizarlo.`,
        type: "PAYMENT",
      },
    });
  }

  return NextResponse.json({ updated: overdue.length });
}
