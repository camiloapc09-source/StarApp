import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculateLevel } from "@/lib/utils";

const assignMissionSchema = z.object({
  playerId: z.string().optional(),
  playerIds: z.array(z.string()).optional(),
  missionId: z.string(),
  target: z.number().default(1),
}).refine((d) => d.playerId || (d.playerIds && d.playerIds.length > 0), {
  message: "Se requiere playerId o playerIds",
});

const awardXPSchema = z.object({
  playerId: z.string(),
  xp: z.number().positive(),
  reason: z.string().optional(),
});

// POST /api/gamification/award-xp
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "assign-mission") {
    const parsed = assignMissionSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const ids = parsed.data.playerIds ?? (parsed.data.playerId ? [parsed.data.playerId] : []);

    for (const pid of ids) {
      const pm = await db.playerMission.upsert({
        where: { playerId_missionId: { playerId: pid, missionId: parsed.data.missionId } },
        create: { playerId: pid, missionId: parsed.data.missionId, target: parsed.data.target, status: "ACTIVE" },
        update: { status: "ACTIVE", progress: 0 },
        include: { mission: true, player: { select: { userId: true } } },
      });

      await db.notification.create({
        data: {
          userId: pm.player.userId,
          title: "¡Nueva misión asignada! ðŸŽ¯",
          message: `Completa "${pm.mission.title}" para ganar ${pm.mission.xpReward} XP.`,
          type: "ACHIEVEMENT",
        },
      });
    }

    return NextResponse.json({ assigned: ids.length }, { status: 201 });
  }

  if (action === "award-xp") {
    const parsed = awardXPSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const player = await db.player.update({
      where: { id: parsed.data.playerId },
      data: { xp: { increment: parsed.data.xp } },
      select: { xp: true, level: true, userId: true },
    });

    const newLevel = calculateLevel(player.xp);
    const leveledUp = newLevel > player.level;

    if (leveledUp) {
      await db.player.update({
        where: { id: parsed.data.playerId },
        data: { level: newLevel },
      });

      await db.notification.create({
        data: {
          userId: player.userId,
          title: `¡Subiste de nivel! ðŸš€ Nivel ${newLevel}`,
          message: `¡Felicitaciones! Alcanzaste el Nivel ${newLevel}. ¡Sigue así!`,
          type: "ACHIEVEMENT",
        },
      });

      // Auto-assign rewards unlocked at this level
      try {
        const newRewards = await db.reward.findMany({ where: { levelRequired: { lte: newLevel } } });
        const earned = await db.playerReward.findMany({ where: { playerId: parsed.data.playerId }, select: { rewardId: true } });
        const earnedIds = new Set(earned.map((r) => r.rewardId));
        const toGrant = newRewards.filter((r) => !earnedIds.has(r.id));
        if (toGrant.length > 0) {
          await db.playerReward.createMany({
            data: toGrant.map((r) => ({ playerId: parsed.data.playerId, rewardId: r.id })),
          });
          await db.notification.createMany({
            data: toGrant.map((r) => ({
              userId: player.userId,
              title: `¡Nueva recompensa! ${r.icon ?? "ðŸ†"} ${r.title}`,
              message: r.description,
              type: "ACHIEVEMENT",
              link: "/dashboard/player/rewards",
            })),
          });
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ...player, xp: player.xp, newLevel, leveledUp });
  }

  if (action === "complete-mission") {
    const { playerMissionId } = body;

    const pm = await db.playerMission.findUnique({
      where: { id: playerMissionId },
      include: { mission: true, player: true },
    });

    if (!pm) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

    await db.playerMission.update({
      where: { id: playerMissionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Award XP
    const player = await db.player.update({
      where: { id: pm.playerId },
      data: { xp: { increment: pm.mission.xpReward } },
      select: { xp: true, level: true, userId: true },
    });

    const newLevel = calculateLevel(player.xp);
    const completeLeveledUp = newLevel > player.level;
    if (completeLeveledUp) {
      await db.player.update({ where: { id: pm.playerId }, data: { level: newLevel } });
    }

    await db.notification.create({
      data: {
        userId: pm.player.userId,
        title: `¡Misión completada! âš¡ +${pm.mission.xpReward} XP`,
        message: `Completaste "${pm.mission.title}" y ganaste ${pm.mission.xpReward} XP.`,
        type: "ACHIEVEMENT",
      },
    });

    if (completeLeveledUp) {
      await db.notification.create({
        data: {
          userId: pm.player.userId,
          title: `¡Subiste de nivel! ðŸš€ Nivel ${newLevel}`,
          message: `¡Alcanzaste el Nivel ${newLevel}!`,
          type: "ACHIEVEMENT",
        },
      });
      try {
        const newRewards = await db.reward.findMany({ where: { levelRequired: { lte: newLevel } } });
        const earned = await db.playerReward.findMany({ where: { playerId: pm.playerId }, select: { rewardId: true } });
        const earnedIds = new Set(earned.map((r) => r.rewardId));
        const toGrant = newRewards.filter((r) => !earnedIds.has(r.id));
        if (toGrant.length > 0) {
          await db.playerReward.createMany({
            data: toGrant.map((r) => ({ playerId: pm.playerId, rewardId: r.id })),
          });
          await db.notification.createMany({
            data: toGrant.map((r) => ({
              userId: pm.player.userId,
              title: `¡Nueva recompensa! ${r.icon ?? "ðŸ†"} ${r.title}`,
              message: r.description,
              type: "ACHIEVEMENT",
              link: "/dashboard/player/rewards",
            })),
          });
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, xpAwarded: pm.mission.xpReward });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
