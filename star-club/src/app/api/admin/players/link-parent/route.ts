import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  playerId: z.string(),
  parentUserId: z.string(),
});

// POST /api/admin/players/link-parent
// Links an existing parent account to a player
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { playerId, parentUserId } = parsed.data;

  const [player, parentUser] = await Promise.all([
    db.player.findFirst({ where: { id: playerId, clubId }, select: { id: true } }),
    db.user.findFirst({ where: { id: parentUserId, clubId, role: "PARENT" }, select: { id: true } }),
  ]);

  if (!player) return apiError("Jugador no encontrado", 404);
  if (!parentUser) return apiError("Padre no encontrado", 404);

  let parent = await db.parent.findUnique({ where: { userId: parentUserId } });
  if (!parent) {
    parent = await db.parent.create({ data: { userId: parentUserId } });
  }

  const existing = await db.parentPlayer.findFirst({
    where: { parentId: parent.id, playerId },
  });
  if (existing) return apiError("Este padre ya está vinculado a este jugador", 409);

  await db.parentPlayer.create({ data: { parentId: parent.id, playerId } });

  return apiOk({ ok: true });
}

// DELETE /api/admin/players/link-parent
// Removes a parent-player link
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { playerId, parentUserId } = await req.json();

  const parentUser = await db.user.findFirst({
    where: { id: parentUserId, clubId, role: "PARENT" },
    select: { parentProfile: { select: { id: true } } },
  });
  if (!parentUser?.parentProfile) return apiError("Padre no encontrado", 404);

  await db.parentPlayer.deleteMany({
    where: { parentId: parentUser.parentProfile.id, playerId },
  });

  return apiOk({ ok: true });
}
