import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";

// POST /api/payments/mark-overdue
// Marks PENDING payments past due date as OVERDUE (scoped to this club)
export async function POST(_req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const now = new Date();

  const overdue = await db.payment.findMany({
    where: { clubId, status: "PENDING", dueDate: { lt: now } },
    select: { id: true, playerId: true, concept: true, amount: true },
  });

  if (overdue.length === 0) {
    return apiOk({ updated: 0, message: "No hay pagos pendientes vencidos." });
  }

  await db.payment.updateMany({
    where: { id: { in: overdue.map((p) => p.id) } },
    data: { status: "OVERDUE" },
  });

  const playerIds = [...new Set(overdue.map((p) => p.playerId))];
  const players = await db.player.findMany({
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
        message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" está vencido.`,
        type: "PAYMENT",
      },
    });
  }

  return apiOk({ updated: overdue.length });
}
