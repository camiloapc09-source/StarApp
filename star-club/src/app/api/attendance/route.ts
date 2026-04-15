import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";

const ATTENDANCE_MISSION_ID = "mision-asistencia-semanal";

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

  // Auto-complete weekly attendance mission ("Doble Presencia")
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  for (const att of presentPlayers) {
    // Find the weekly attendance mission for this player (any status)
    let pm = await db.playerMission.findFirst({
      where: { playerId: att.playerId, missionId: ATTENDANCE_MISSION_ID },
      include: {
        mission: true,
        player: { select: { userId: true, xp: true, level: true } },
      },
    });

    if (!pm) continue; // Mission not assigned to this player

    // If completed in a previous week, reset it for the new week
    if (pm.status === "COMPLETED" && pm.completedAt && pm.completedAt < weekStart) {
      pm = await db.playerMission.update({
        where: { id: pm.id },
        data: { status: "ACTIVE", progress: 0, completedAt: null },
        include: {
          mission: true,
          player: { select: { userId: true, xp: true, level: true } },
        },
      });
    }

    if (pm.status !== "ACTIVE") continue; // Already completed this week

    // Count PRESENT attendances this week
    const weeklyCount = await db.attendance.count({
      where: {
        playerId: att.playerId,
        status: "PRESENT",
        session: { date: { gte: weekStart, lte: weekEnd } },
      },
    });

    if (weeklyCount >= 2) {
      // Complete the mission
      await db.playerMission.update({
        where: { id: pm.id },
        data: { status: "COMPLETED", completedAt: new Date(), progress: weeklyCount },
      });

      // Award XP
      const updatedPlayer = await db.player.update({
        where: { id: att.playerId },
        data: { xp: { increment: pm.mission.xpReward } },
        select: { xp: true, level: true },
      });

      const newLevel = calculateLevel(updatedPlayer.xp);
      if (newLevel > updatedPlayer.level) {
        await db.player.update({ where: { id: att.playerId }, data: { level: newLevel } });
      }

      // Notify player
      await db.notification.create({
        data: {
          userId: pm.player.userId,
          title: `Mision semanal completada +${pm.mission.xpReward} XP`,
          message: `Asististe a los dos entrenos de la semana. Ganaste ${pm.mission.xpReward} XP.`,
          type: "ACHIEVEMENT",
        },
      });
    } else {
      // Just update progress
      await db.playerMission.update({
        where: { id: pm.id },
        data: { progress: weeklyCount },
      });
    }
  }

  return NextResponse.json({ count: results.length });
}
