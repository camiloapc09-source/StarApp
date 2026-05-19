import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// DELETE /api/rifas/[id]/tickets/[num]/release — owner or admin releases a number
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const session = await requireRole(["PARENT", "PLAYER", "ADMIN"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id: raffleId, num } = await params;
  const number = parseInt(num, 10);
  if (isNaN(number)) return apiError("Número inválido", 400);

  const raffle = await db.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);
  if (raffle.status !== "OPEN") return apiError("No se puede liberar en esta rifa", 400);

  const ticket = await db.raffleTicket.findUnique({
    where: { raffleId_number: { raffleId, number } },
  });
  if (!ticket) return apiError("Número no encontrado", 404);
  if (ticket.status === "PAID") return apiError("No se puede liberar un número ya pagado", 400);

  if (session.user.role !== "ADMIN" && ticket.takenById !== session.user.id) {
    return apiError("No tienes permiso", 403);
  }

  await db.raffleTicket.delete({ where: { raffleId_number: { raffleId, number } } });
  return apiOk({ ok: true });
}
