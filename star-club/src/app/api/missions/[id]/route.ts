import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const patchSchema = z.object({
  title:       z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  xpReward:    z.number().int().min(1).max(1000).optional(),
  type:        z.enum(["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"]).optional(),
  icon:        z.string().max(10).optional(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.mission.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const mission = await db.mission.update({ where: { id }, data: parsed.data });
  return apiOk(mission);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const { id } = await params;

  const existing = await db.mission.findUnique({ where: { id }, select: { clubId: true } });
  if (!existing || existing.clubId !== clubId) return apiError("Not found", 404);

  await db.mission.delete({ where: { id } });
  return apiOk({ ok: true });
}
