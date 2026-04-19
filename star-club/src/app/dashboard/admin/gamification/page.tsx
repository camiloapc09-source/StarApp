import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateLevel, LEVEL_TITLES, xpForLevel, xpForNextLevel, xpProgress } from "@/lib/utils";
import { Zap, Trophy, Target, Flame, Star } from "lucide-react";
import GamificationActions from "@/components/admin/gamification-actions";
import MissionsManager from "@/components/admin/missions-manager";
import RewardsManager from "@/components/admin/rewards-manager";

export default async function AdminGamificationPage() {
  const t = await getDictionary();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [missions, players, allPlayers, rewards] = await Promise.all([
    db.mission.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { playerMissions: true } } },
    }),
    db.player.findMany({
      where: { clubId },
      orderBy: { xp: "desc" },
      take: 10,
      include: { user: { select: { name: true, avatar: true } } },
    }),
    db.player.findMany({
      where: { clubId, status: "ACTIVE" },
      orderBy: { user: { name: "asc" } },
      select: { id: true, xp: true, user: { select: { name: true } } },
    }),
    db.reward.findMany({
      where: { clubId },
      orderBy: { levelRequired: "asc" },
      include: { _count: { select: { playerRewards: true } } },
    }),
  ]);

  const activeMissions = missions.filter((m) => m.isActive !== false);

  return (
    <div>
      <Header title={t.common.gamification} subtitle={t.gamification.subtitle} />
      <div className="p-4 md:p-8 space-y-6">
        {/* Actions panel */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Flame size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold text-lg">Acciones</h2>
          </div>
          <GamificationActions
            players={allPlayers.map((p) => ({ id: p.id, name: p.user.name, xp: p.xp }))}
            missions={activeMissions.map((m) => ({ id: m.id, title: m.title, xpReward: m.xpReward, type: m.type }))}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">{t.gamification.leaderboard}</h2>
              <Trophy size={18} style={{ color: "var(--warning)" }} />
            </div>
            <div className="space-y-3">
              {players.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }} className="text-sm text-center py-4">
                  {t.gamification.noPlayers}
                </p>
              ) : (
                players.map((player, i) => {
                  const level = calculateLevel(player.xp);
                  const progress = xpProgress(player.xp, level);
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold w-6 text-right"
                        style={{
                          color:
                            i === 0
                              ? "var(--warning)"
                              : i === 1
                              ? "#c0c0c0"
                              : i === 2
                              ? "#cd7f32"
                              : "var(--text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <Avatar name={player.user.name} src={player.user.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{player.user.name}</span>
                          <span className="text-xs" style={{ color: "var(--accent)" }}>
                            Lv.{level} {LEVEL_TITLES[level]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={progress}
                            max={100}
                            height="sm"
                            animated={false}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                            <Zap size={11} />
                            <span>{player.xp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Missions management */}
          <Card>
            <MissionsManager initial={missions.map((m) => ({ ...m, isActive: m.isActive !== false }))} />
          </Card>
        </div>

        {/* Rewards management */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Star size={18} style={{ color: "var(--warning)" }} />
            <h2 className="font-semibold text-lg">Gestor de recompensas</h2>
          </div>
          <RewardsManager initial={rewards} />
        </Card>
      </div>
    </div>
  );
}
