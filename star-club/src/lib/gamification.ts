import { db } from "@/lib/db";
import { calculateLevel } from "@/lib/utils";

export interface AwardXpResult {
  xp: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  grantedRewards: { id: string; title: string; icon: string | null; description: string }[];
}

/**
 * Otorga XP a un jugador y, de forma atómica:
 *  - recalcula el nivel a partir del XP total,
 *  - notifica al jugador si subió de nivel,
 *  - entrega (una sola vez) todas las recompensas cuyo nivel requerido ya alcanzó
 *    y notifica cada una.
 *
 * Es el único punto por donde debe otorgarse XP para mantener nivel y recompensas
 * siempre consistentes. Todas las escrituras van dentro de una transacción.
 */
export async function awardXp(
  playerId: string,
  clubId: string,
  xp: number,
  opts: { touchLastActive?: boolean } = {},
): Promise<AwardXpResult> {
  return db.$transaction(async (tx) => {
    const before = await tx.player.findUnique({
      where: { id: playerId },
      select: { level: true },
    });
    const previousLevel = before?.level ?? 1;

    const player = await tx.player.update({
      where: { id: playerId },
      data: {
        xp: { increment: xp },
        ...(opts.touchLastActive ? { lastActive: new Date() } : {}),
      },
      select: { xp: true, userId: true },
    });

    const newLevel = calculateLevel(player.xp);
    const leveledUp = newLevel > previousLevel;

    const grantedRewards: AwardXpResult["grantedRewards"] = [];

    if (leveledUp) {
      await tx.player.update({ where: { id: playerId }, data: { level: newLevel } });

      await tx.notification.create({
        data: {
          userId: player.userId,
          title: `Subiste al Nivel ${newLevel} ⭐`,
          message: `¡Felicitaciones! Alcanzaste el Nivel ${newLevel}. ¡Sigue así!`,
          type: "ACHIEVEMENT",
        },
      });

      // Entregar recompensas recién desbloqueadas (idempotente: excluye las ya ganadas)
      const eligible = await tx.reward.findMany({
        where: { clubId, levelRequired: { lte: newLevel } },
        select: { id: true, title: true, icon: true, description: true },
      });
      if (eligible.length > 0) {
        const earned = await tx.playerReward.findMany({
          where: { playerId },
          select: { rewardId: true },
        });
        const earnedIds = new Set(earned.map((r) => r.rewardId));
        const toGrant = eligible.filter((r) => !earnedIds.has(r.id));

        if (toGrant.length > 0) {
          await tx.playerReward.createMany({
            data: toGrant.map((r) => ({ playerId, rewardId: r.id })),
          });
          await tx.notification.createMany({
            data: toGrant.map((r) => ({
              userId: player.userId,
              title: `Nueva recompensa ${r.icon ?? "🎁"} ${r.title}`,
              message: r.description,
              type: "ACHIEVEMENT",
              link: "/dashboard/player/rewards",
            })),
          });
          grantedRewards.push(...toGrant);
        }
      }
    }

    return { xp: player.xp, previousLevel, newLevel, leveledUp, grantedRewards };
  });
}
