import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const rewardSchema = z.object({
  title:         z.string().min(1).max(80).optional(),
  description:   z.string().min(1).max(400).optional(),
  icon:          z.string().max(10).optional(),
  levelRequired: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.reward.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = rewardSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const reward = await db.reward.update({ where: { id }, data: parsed.data });
  return apiOk(reward);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.reward.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  await db.reward.delete({ where: { id } });
  return apiOk({ ok: true });
}
