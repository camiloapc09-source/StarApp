import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/api";

/**
 * POST /api/cron/daily-reset
 *
 * Tarea diaria (medianoche Colombia) que mantiene "vivo" el sistema de misiones:
 *   1. Expira las misiones DIARIAS/SEMANALES activas que no se completaron a tiempo,
 *      para que no se acumulen ni se puedan completar tarde.
 *   2. Actualiza la racha (streak) de cada jugador activo: +1 si estuvo activo ayer
 *      (completó una misión o asistió a entrenamiento), o 0 si no.
 *
 * Autorización: header `Authorization: Bearer <CRON_SECRET>` (GitHub Actions),
 * o una sesión de ADMIN (para dispararlo manualmente desde el panel).
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

const STREAK_MILESTONES = new Set([3, 7, 14, 30, 60, 100]);

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) return apiError("Forbidden", 403);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeekAgo = new Date(startOfToday);
  startOfWeekAgo.setDate(startOfWeekAgo.getDate() - 7);

  // 1) Expirar misiones vencidas ------------------------------------------------
  const expiredDaily = await db.playerMission.updateMany({
    where: {
      status: "ACTIVE",
      assignedAt: { lt: startOfToday },
      mission: { type: "DAILY" },
    },
    data: { status: "EXPIRED" },
  });

  const expiredWeekly = await db.playerMission.updateMany({
    where: {
      status: "ACTIVE",
      assignedAt: { lt: startOfWeekAgo },
      mission: { type: "WEEKLY" },
    },
    data: { status: "EXPIRED" },
  });

  // 2) Actualizar rachas --------------------------------------------------------
  // IMPORTANTE: las rachas se calculan ANTES de reasignar misiones (paso 3),
  // porque reasignar resetea a ACTIVE las misiones completadas ayer y la racha
  // se calcula leyendo justamente esas completadas.
  const players = await db.player.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, streak: true, clubId: true },
  });

  // Jugadores que completaron alguna misión ayer
  const completedYesterday = await db.playerMission.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: startOfYesterday, lt: startOfToday },
    },
    select: { playerId: true },
  });

  // Jugadores que asistieron (PRESENT/LATE) a un entrenamiento de ayer
  const attendedYesterday = await db.attendance.findMany({
    where: {
      status: { in: ["PRESENT", "LATE"] },
      session: { date: { gte: startOfYesterday, lt: startOfToday } },
    },
    select: { playerId: true },
  });

  const activeIds = new Set<string>([
    ...completedYesterday.map((c) => c.playerId),
    ...attendedYesterday.map((a) => a.playerId),
  ]);

  let increased = 0;
  let reset = 0;
  for (const p of players) {
    const wasActive = activeIds.has(p.id);
    const newStreak = wasActive ? p.streak + 1 : 0;
    if (newStreak === p.streak) continue; // sin cambios (racha 0 → 0)

    await db.player.update({ where: { id: p.id }, data: { streak: newStreak } });

    if (wasActive) {
      increased++;
      if (STREAK_MILESTONES.has(newStreak)) {
        await db.notification.create({
          data: {
            userId: p.userId,
            title: `¡Racha de ${newStreak} días! 🔥`,
            message: `Llevas ${newStreak} días seguidos activo. ¡No la rompas!`,
            type: "ACHIEVEMENT",
          },
        });
      }
    } else {
      reset++;
    }
  }

  // 3) Asignar las misiones diarias del día -------------------------------------
  // Cada jugador activo recibe todas las misiones DAILY activas de su club.
  // El coach controla qué aparece marcando misiones como activas/inactivas.
  const dailyMissions = await db.mission.findMany({
    where: { isActive: true, type: "DAILY" },
    select: { id: true, clubId: true },
  });

  // Agrupar misiones diarias por club
  const missionsByClub = new Map<string, string[]>();
  for (const m of dailyMissions) {
    const arr = missionsByClub.get(m.clubId) ?? [];
    arr.push(m.id);
    missionsByClub.set(m.clubId, arr);
  }

  let assignedCount = 0;
  let playersNotified = 0;
  for (const p of players) {
    const missionIds = missionsByClub.get(p.clubId);
    if (!missionIds || missionIds.length === 0) continue;

    await Promise.all(
      missionIds.map((missionId) =>
        db.playerMission.upsert({
          where: { playerId_missionId: { playerId: p.id, missionId } },
          create: { playerId: p.id, missionId, target: 1, status: "ACTIVE" },
          // Reset diario: vuelve a ACTIVE aunque ayer estuviera completada/expirada.
          update: { status: "ACTIVE", progress: 0, completedAt: null, assignedAt: new Date() },
        }),
      ),
    );
    assignedCount += missionIds.length;

    await db.notification.create({
      data: {
        userId: p.userId,
        title: "Misiones diarias listas 🎯",
        message: `Tienes ${missionIds.length} misión(es) nueva(s) para hoy. ¡A por el XP!`,
        type: "ACHIEVEMENT",
        link: "/dashboard/player/missions",
      },
    });
    playersNotified++;
  }

  return apiOk({
    ok: true,
    expiredDaily: expiredDaily.count,
    expiredWeekly: expiredWeekly.count,
    streaksIncreased: increased,
    streaksReset: reset,
    dailyAssigned: assignedCount,
    playersNotified,
    ranAt: now.toISOString(),
  });
}
