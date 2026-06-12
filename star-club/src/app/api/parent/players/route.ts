import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

// GET /api/parent/players?q=name
// Returns players in the same club that:
//  - have NO active ParentPlayer link (status=ACTIVE) to ANY parent
//  - are not already pending for THIS parent
// Requires PARENT auth.
export async function GET(req: NextRequest) {
  const session = await requireRole(["PARENT"]);
  if (isResponse(session)) return session;

  const clubId = getClubId(session);
  const userId = session.user.id;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const parent = await db.parent.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!parent) return apiError("Perfil de acudiente no encontrado", 404);

  const players = await db.player.findMany({
    where: {
      clubId,
      status: "ACTIVE",
      // No active link to ANY parent
      parentLinks: {
        none: { status: "ACTIVE" },
      },
      // Not already pending for THIS parent
      NOT: {
        parentLinks: {
          some: { parentId: parent.id, status: "PENDING" },
        },
      },
      ...(q
        ? {
            user: {
              name: { contains: q, mode: "insensitive" },
            },
          }
        : {}),
    },
    select: {
      id: true,
      documentNumber: true,
      user: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
    take: 20,
  });

  return apiOk(
    players.map((p) => ({
      id: p.id,
      name: p.user.name,
      category: p.category?.name ?? null,
      documentNumber: p.documentNumber ?? null,
    }))
  );
}
