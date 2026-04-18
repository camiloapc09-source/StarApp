import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const rewardSchema = z.object({
  title:         z.string().min(1).max(80),
  description:   z.string().min(1).max(400),
  icon:          z.string().max(10).optional(),
  levelRequired: z.number().int().min(1).max(100),
});

export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const rewards = await db.reward.findMany({
    where: { clubId },
    orderBy: { levelRequired: "asc" },
    include: { _count: { select: { playerRewards: true } } },
  });
  return apiOk(rewards);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = rewardSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const reward = await db.reward.create({ data: { ...parsed.data, clubId } });
  return apiOk(reward, 201);
}
