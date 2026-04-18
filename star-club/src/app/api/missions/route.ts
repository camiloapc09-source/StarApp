import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const missionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  xpReward: z.number().int().min(1).max(1000),
  type: z.enum(["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"]).default("DAILY"),
  icon: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = missionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const mission = await db.mission.create({ data: { ...parsed.data, clubId } });
  return apiOk(mission, 201);
}

export async function GET(_req: NextRequest) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const missions = await db.mission.findMany({
    where: { clubId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { playerMissions: true } } },
  });
  return apiOk(missions);
}
