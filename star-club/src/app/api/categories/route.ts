import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  ageMin: z.number().int().min(0).max(99),
  ageMax: z.number().int().min(0).max(99),
});

export async function GET(_req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const categories = await db.category.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
  });
  return apiOk(categories);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  // Plan enforcement — category limit
  const { getLimits } = await import("@/lib/plans");
  const club = await db.club.findUnique({ where: { id: clubId }, select: { plan: true } });
  const limits = getLimits(club?.plan ?? "STARTER");
  if (limits.maxCategories !== Infinity) {
    const count = await db.category.count({ where: { clubId } });
    if (count >= limits.maxCategories) {
      return apiError(
        `Tu plan ${club?.plan ?? "STARTER"} permite máximo ${limits.maxCategories} categorías. Actualiza a PRO para agregar más.`,
        403
      );
    }
  }

  try {
    const category = await db.category.create({ data: { ...parsed.data, clubId } });
    return apiOk(category, 201);
  } catch {
    return apiError("Una categoría con ese nombre ya existe", 409);
  }
}
