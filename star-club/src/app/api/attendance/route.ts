import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const attendanceSchema = z.object({
  sessionId: z.string(),
  attendances: z.array(
    z.object({
      playerId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
    })
  ),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const playerId = searchParams.get("playerId");

  const attendances = await db.attendance.findMany({
    where: {
      ...(sessionId ? { sessionId } : {}),
      ...(playerId ? { playerId } : {}),
    },
    include: {
      player: { include: { user: true } },
      session: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attendances);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = attendanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { sessionId, attendances } = parsed.data;

  // Upsert each attendance record
  const results = await Promise.all(
    attendances.map((att) =>
      db.attendance.upsert({
        where: { playerId_sessionId: { playerId: att.playerId, sessionId } },
        create: { playerId: att.playerId, sessionId, status: att.status },
        update: { status: att.status },
      })
    )
  );

  // Award XP to present players
  const presentPlayers = attendances.filter((a) => a.status === "PRESENT");
  for (const att of presentPlayers) {
    await db.player.update({
      where: { id: att.playerId },
      data: { xp: { increment: 10 }, lastActive: new Date() },
    });
  }

  return NextResponse.json({ count: results.length });
}
