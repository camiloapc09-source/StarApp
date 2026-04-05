import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  title:       z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  xpReward:    z.number().int().min(1).max(1000).optional(),
  type:        z.enum(["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"]).optional(),
  icon:        z.string().max(10).optional(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const mission = await db.mission.update({ where: { id }, data: parsed.data });
  return NextResponse.json(mission);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.mission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
