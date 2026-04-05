import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const rewardSchema = z.object({
  title:         z.string().min(1).max(80),
  description:   z.string().min(1).max(400),
  icon:          z.string().max(10).optional(),
  levelRequired: z.number().int().min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rewards = await db.reward.findMany({
    orderBy: { levelRequired: "asc" },
    include: { _count: { select: { playerRewards: true } } },
  });
  return NextResponse.json(rewards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = rewardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const reward = await db.reward.create({ data: parsed.data });
  return NextResponse.json(reward, { status: 201 });
}
