import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// POST /api/admin/coaches/player-profile — create a player profile for a coach
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const { coachId, categoryId } = body as { coachId: string; categoryId?: string };

  if (!coachId) return apiError("coachId es requerido", 400);

  // Verify the coach belongs to this club
  const coach = await db.user.findFirst({
    where: { id: coachId, clubId, role: "COACH" },
    select: { id: true, name: true },
  });
  if (!coach) return apiError("Entrenador no encontrado", 404);

  // Prevent duplicate player profiles
  const existing = await db.player.findUnique({
    where: { userId: coachId },
    select: { id: true },
  });
  if (existing) return apiError("Este entrenador ya tiene un perfil de jugador", 400);

  // Create the player profile linked to the coach user
  const player = await db.player.create({
    data: {
      clubId,
      userId: coachId,
      paymentExempt: true,
      status: "ACTIVE",
      ...(categoryId ? { categoryId } : {}),
    },
    select: { id: true },
  });

  // Clear the request flag
  await db.user.update({
    where: { id: coachId },
    data: { requestedPlayerProfile: false },
  });

  // Notify the coach
  await db.notification.create({
    data: {
      userId: coachId,
      title: "¡Perfil de jugador activado! 🎮",
      message: "El administrador activó tu perfil de jugador. Ya puedes cambiar a modo jugador desde tu dashboard.",
      type: "INFO",
    },
  });

  return apiOk({ playerId: player.id });
}

// DELETE /api/admin/coaches/player-profile — remove a coach's player profile
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const { coachId } = body as { coachId: string };

  if (!coachId) return apiError("coachId es requerido", 400);

  const player = await db.player.findFirst({
    where: { userId: coachId, clubId },
    select: { id: true },
  });
  if (!player) return apiError("Perfil de jugador no encontrado", 404);

  await db.player.delete({ where: { id: player.id } });

  return apiOk({ ok: true });
}
