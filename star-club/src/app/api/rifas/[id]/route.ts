import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// GET /api/rifas/[id] — single raffle with all tickets
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const raffle = await db.raffle.findUnique({
    where: { id },
    include: {
      tickets: {
        select: {
          id: true,
          number: true,
          status: true,
          ownerName: true,
          takenAt: true,
          paidAt: true,
          proofUrl: true,
          takenById: true,
          takenBy: { select: { name: true, id: true } },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);
  return apiOk(raffle);
}

// PUT /api/rifas/[id] — admin updates raffle
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const raffle = await db.raffle.findUnique({ where: { id } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  const body = await req.json();
  const { title, description, prize, ticketPrice, status, drawDate } = body;

  const updated = await db.raffle.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
      ...(prize !== undefined && { prize: prize?.trim() ?? null }),
      ...(ticketPrice !== undefined && { ticketPrice }),
      ...(status !== undefined && { status }),
      ...(drawDate !== undefined && { drawDate: drawDate ? new Date(drawDate) : null }),
    },
  });

  return apiOk(updated);
}

// DELETE /api/rifas/[id] — admin deletes raffle
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const raffle = await db.raffle.findUnique({ where: { id } });
  if (!raffle || raffle.clubId !== clubId) return apiError("Rifa no encontrada", 404);

  await db.raffle.delete({ where: { id } });
  return apiOk({ ok: true });
}
