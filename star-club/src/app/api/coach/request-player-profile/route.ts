import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

// POST /api/coach/request-player-profile — coach requests to also be a player
export async function POST(_req: NextRequest) {
  const session = await requireRole(["COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  // Check if already has a player profile
  const existing = await db.player.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existing) return apiError("Ya tienes un perfil de jugador activo", 400);

  // Mark the request
  await db.user.update({
    where: { id: session.user.id },
    data: { requestedPlayerProfile: true },
  });

  // Notify all admins in the club
  const admins = await db.user.findMany({
    where: { clubId, role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length > 0) {
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Solicitud de perfil de jugador",
        message: `El entrenador ${session.user.name} solicita ser registrado también como jugador.`,
        type: "INFO",
      })),
    });
  }

  return apiOk({ ok: true });
}
