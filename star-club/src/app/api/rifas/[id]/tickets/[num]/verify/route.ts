import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// POST /api/rifas/[id]/tickets/[num]/verify — admin marks ticket as PAID
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id: raffleId, num } = await params;
  const number = parseInt(num, 10);
  if (isNaN(number)) return apiError("Número inválido", 400);

  const raffle = await db.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  const ticket = await db.raffleTicket.findUnique({
    where: { raffleId_number: { raffleId, number } },
  });
  if (!ticket) return apiError("Número no encontrado", 404);
  if (ticket.status === "PAID") return apiError("Ya está marcado como pagado", 400);

  const updated = await db.raffleTicket.update({
    where: { raffleId_number: { raffleId, number } },
    data: {
      status: "PAID",
      paidAt: new Date(),
      verifiedById: session.user.id,
    },
  });

  return apiOk(updated);
}

// DELETE /api/rifas/[id]/tickets/[num]/verify — admin reverts to TAKEN
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id: raffleId, num } = await params;
  const number = parseInt(num, 10);
  if (isNaN(number)) return apiError("Número inválido", 400);

  const raffle = await db.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  await db.raffleTicket.update({
    where: { raffleId_number: { raffleId, number } },
    data: { status: "TAKEN", paidAt: null, verifiedById: null },
  });

  return apiOk({ ok: true });
}
