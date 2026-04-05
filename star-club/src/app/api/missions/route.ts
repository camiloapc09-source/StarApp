import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const missionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  xpReward: z.number().int().min(1).max(1000),
  type: z.enum(["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"]).default("DAILY"),
  icon: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = missionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const mission = await db.mission.create({ data: parsed.data });
  return NextResponse.json(mission, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const missions = await db.mission.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { playerMissions: true } } },
  });
  return NextResponse.json(missions);
}
