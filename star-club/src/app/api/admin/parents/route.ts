import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";

// GET /api/admin/parents?q=nombre
// Returns all PARENT users in the club (for the link-existing-parent selector)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const parents = await db.user.findMany({
    where: {
      clubId,
      role: "PARENT",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      parentProfile: {
        select: {
          id: true,
          children: {
            select: {
              player: { select: { user: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return apiOk(parents);
}
