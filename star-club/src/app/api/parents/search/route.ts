import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getClubId, isResponse, apiOk, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  if (session.user.role !== "ADMIN") return apiError("No autorizado", 403);

  const clubId = getClubId(session);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return apiOk([]);

  const parents = await db.parent.findMany({
    where: {
      user: { clubId },
      OR: [
        { user: { name: { contains: q, mode: "insensitive" } } },
        {
          children: {
            some: {
              player: {
                user: { name: { contains: q, mode: "insensitive" } },
              },
            },
          },
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      children: {
        include: {
          player: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      },
    },
    take: 10,
  });

  return apiOk(
    parents.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      phone: p.user.phone ?? p.phone ?? null,
      children: p.children.map((c) => c.player.user.name),
    }))
  );
}
