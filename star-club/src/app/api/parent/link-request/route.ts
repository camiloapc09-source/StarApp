import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const postSchema = z.object({
  playerId: z.string(),
});

// POST /api/parent/link-request
// Creates a ParentPlayer record with status=PENDING and notifies the admin.
export async function POST(req: NextRequest) {
  const session = await requireRole(["PARENT"]);
  if (isResponse(session)) return session;

  const clubId = getClubId(session);
  const userId = session.user.id;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { playerId } = parsed.data;

  // Get parent profile
  const parent = await db.parent.findUnique({
    where: { userId },
    include: { user: { select: { name: true } } },
  });
  if (!parent) return apiError("Perfil de acudiente no encontrado", 404);

  // Validate player belongs to same club
  const player = await db.player.findFirst({
    where: { id: playerId, clubId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!player) return apiError("Jugador no encontrado", 404);

  // Check for duplicate (@@unique will catch this too, but give a better message)
  const existing = await db.parentPlayer.findUnique({
    where: { parentId_playerId: { parentId: parent.id, playerId } },
  });
  if (existing) {
    if (existing.status === "ACTIVE") return apiError("Ya estás vinculado a este jugador", 409);
    if (existing.status === "PENDING") return apiError("Ya tienes una solicitud pendiente para este jugador", 409);
  }

  // Create the pending link
  await db.parentPlayer.create({
    data: { parentId: parent.id, playerId, status: "PENDING" },
  });

  // Notify the club admin
  const adminUser = await db.user.findFirst({
    where: { clubId, role: "ADMIN" },
    select: { id: true },
  });
  if (adminUser) {
    await db.notification.create({
      data: {
        userId: adminUser.id,
        title: "Solicitud de vinculación",
        message: `${parent.user.name} solicita vincularse como acudiente de ${player.user.name}`,
        type: "INFO",
      },
    });
  }

  return apiOk({ ok: true });
}

// GET /api/parent/link-request
// Returns this parent's PENDING ParentPlayer links with player name.
export async function GET() {
  const session = await requireRole(["PARENT"]);
  if (isResponse(session)) return session;

  const userId = session.user.id;

  const parent = await db.parent.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!parent) return apiOk([]);

  const pendingLinks = await db.parentPlayer.findMany({
    where: { parentId: parent.id, status: "PENDING" },
    include: {
      player: {
        select: {
          id: true,
          user: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  return apiOk(
    pendingLinks.map((link) => ({
      id: link.id,
      playerId: link.playerId,
      playerName: link.player.user.name,
      category: link.player.category?.name ?? null,
    }))
  );
}
