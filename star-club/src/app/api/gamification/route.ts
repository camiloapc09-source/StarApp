import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { awardXp } from "@/lib/gamification";
import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const assignMissionSchema = z.object({
  playerId: z.string().optional(),
  playerIds: z.array(z.string()).optional(),
  missionId: z.string(),
  target: z.number().default(1),
}).refine((d) => d.playerId || (d.playerIds && d.playerIds.length > 0), {
  message: "Se requiere playerId o playerIds",
});

const createAndAssignSchema = z.object({
  playerId: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  xpReward: z.number().int().min(1).max(1000).default(50),
  type: z.enum(["DAILY", "WEEKLY", "CHALLENGE", "SPECIAL"]).default("CHALLENGE"),
});

const awardXPSchema = z.object({
  playerId: z.string(),
  xp: z.number().positive(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const { action } = body;

  if (action === "assign-mission") {
    const parsed = assignMissionSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

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
          title: "Nueva mision asignada",
          message: `Completa "${pm.mission.title}" para ganar ${pm.mission.xpReward} XP.`,
          type: "ACHIEVEMENT",
        },
      });
    }

    return apiOk({ assigned: ids.length }, 201);
  }

  if (action === "award-xp") {
    const parsed = awardXPSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

    const playerCheck = await db.player.findUnique({ where: { id: parsed.data.playerId }, select: { clubId: true } });
    if (!playerCheck || playerCheck.clubId !== clubId) return apiError("Player not found", 404);

    const result = await awardXp(parsed.data.playerId, clubId, parsed.data.xp);
    return apiOk({ xp: result.xp, newLevel: result.newLevel, leveledUp: result.leveledUp });
  }

  if (action === "complete-mission") {
    const { playerMissionId } = body;

    const pm = await db.playerMission.findUnique({
      where: { id: playerMissionId },
      include: { mission: true, player: true },
    });

    if (!pm) return apiError("Mission not found", 404);
    if (pm.player.clubId !== clubId) return apiError("Forbidden", 403);

    // Idempotencia: si ya estaba completada, no volver a otorgar XP.
    if (pm.status === "COMPLETED") return apiOk({ ok: true, xpAwarded: 0, alreadyCompleted: true });

    await db.playerMission.update({
      where: { id: playerMissionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await db.notification.create({
      data: {
        userId: pm.player.userId,
        title: `Misión completada +${pm.mission.xpReward} XP`,
        message: `Completaste "${pm.mission.title}" y ganaste ${pm.mission.xpReward} XP.`,
        type: "ACHIEVEMENT",
      },
    });

    await awardXp(pm.playerId, clubId, pm.mission.xpReward, { touchLastActive: true });

    return apiOk({ ok: true, xpAwarded: pm.mission.xpReward });
  }

  if (action === "create-and-assign") {
    const parsed = createAndAssignSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

    const playerCheck = await db.player.findFirst({
      where: { id: parsed.data.playerId, clubId },
      select: { id: true, userId: true },
    });
    if (!playerCheck) return apiError("Jugador no encontrado", 404);

    // Create a club-level mission (inactive so it doesn't pollute the global list)
    const mission = await db.mission.create({
      data: {
        clubId,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        xpReward: parsed.data.xpReward,
        type: parsed.data.type,
        isActive: false, // private — only assigned to this player
      },
    });

    const pm = await db.playerMission.create({
      data: { playerId: parsed.data.playerId, missionId: mission.id, target: 1, status: "ACTIVE" },
    });

    await db.notification.create({
      data: {
        userId: playerCheck.userId,
        title: "Nueva misión personalizada",
        message: `Tu entrenador te asignó: "${mission.title}" (+${mission.xpReward} XP).`,
        type: "ACHIEVEMENT",
      },
    });

    return apiOk({ mission, playerMissionId: pm.id }, 201);
  }

  return apiError("Unknown action", 400);
}
