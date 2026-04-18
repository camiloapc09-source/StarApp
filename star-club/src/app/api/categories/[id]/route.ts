import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  ageMin: z.number().int().min(0).max(99),
  ageMax: z.number().int().min(0).max(99),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.category.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  try {
    const category = await db.category.update({ where: { id }, data: parsed.data });
    return apiOk(category);
  } catch {
    return apiError("Not found o nombre duplicado", 409);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.category.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  await db.category.delete({ where: { id } });
  return apiOk({ ok: true });
}
