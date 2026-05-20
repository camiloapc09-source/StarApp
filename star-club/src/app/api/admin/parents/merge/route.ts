import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  keepUserId:   z.string(),
  deleteUserId: z.string(),
});

// POST /api/admin/parents/merge
// Merges two parent accounts: transfers all children from deleteUser to keepUser, then deletes deleteUser.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { keepUserId, deleteUserId } = parsed.data;
  if (keepUserId === deleteUserId) return apiError("Las cuentas deben ser distintas", 400);

  // Verify both belong to admin's club and are PARENT
  const [keepUser, deleteUser] = await Promise.all([
    db.user.findUnique({ where: { id: keepUserId }, select: { id: true, role: true, clubId: true } }),
    db.user.findUnique({ where: { id: deleteUserId }, select: { id: true, role: true, clubId: true } }),
  ]);

  if (!keepUser || keepUser.clubId !== clubId || keepUser.role !== "PARENT")
    return apiError("Cuenta principal no válida", 404);
  if (!deleteUser || deleteUser.clubId !== clubId || deleteUser.role !== "PARENT")
    return apiError("Cuenta a eliminar no válida", 404);

  // Get parent profiles
  const [keepParent, deleteParent] = await Promise.all([
    db.parent.findUnique({ where: { userId: keepUserId }, select: { id: true } }),
    db.parent.findUnique({
      where: { userId: deleteUserId },
      select: { id: true, children: { select: { playerId: true } } },
    }),
  ]);

  if (!keepParent)   return apiError("Perfil de acudiente principal no encontrado", 404);
  if (!deleteParent) return apiError("Perfil de acudiente a eliminar no encontrado", 404);

  // Find which children from deleteParent are not yet linked to keepParent
  const existingLinks = await db.parentPlayer.findMany({
    where: { parentId: keepParent.id },
    select: { playerId: true },
  });
  const alreadyLinked = new Set(existingLinks.map((l) => l.playerId));

  const toTransfer = deleteParent.children
    .map((c) => c.playerId)
    .filter((pid) => !alreadyLinked.has(pid));

  // Transaction: transfer children → delete duplicate parent → delete duplicate user
  await db.$transaction([
    ...toTransfer.map((playerId) =>
      db.parentPlayer.create({ data: { parentId: keepParent.id, playerId } })
    ),
    db.parentPlayer.deleteMany({ where: { parentId: deleteParent.id } }),
    db.parent.delete({ where: { id: deleteParent.id } }),
    db.user.delete({ where: { id: deleteUserId } }),
  ]);

  return apiOk({ merged: toTransfer.length });
}
