import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";
import { sendOverduePaymentEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

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

  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
  const appUrl = process.env.NEXTAUTH_URL ?? "https://starapp.onrender.com";

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

    // Push al usuario del jugador
    await sendPushToUser(userId, {
      title: "Pago vencido ⚠️",
      body: `$${payment.amount.toLocaleString("es-CO")} por "${payment.concept}"`,
      url: "/dashboard/parent/payments",
    });

    // Email al padre vinculado
    const player = await db.player.findUnique({
      where: { id: payment.playerId },
      select: {
        user: { select: { name: true } },
        parentLinks: {
          take: 1,
          include: { parent: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
    });
    const parentLink = player?.parentLinks[0]?.parent;
    if (parentLink?.user?.email) {
      await sendOverduePaymentEmail({
        to: parentLink.user.email,
        parentName: parentLink.user.name,
        playerName: player?.user.name ?? "",
        concept: payment.concept,
        amountCOP: payment.amount,
        clubName: club?.name ?? "Star Club",
        appUrl,
      });
    }
  }

  return apiOk({ updated: overdue.length });
}
