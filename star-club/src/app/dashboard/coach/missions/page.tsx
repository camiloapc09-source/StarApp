import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateLevel, LEVEL_TITLES, xpProgress } from "@/lib/utils";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import GamificationActions from "@/components/admin/gamification-actions";

export default async function CoachMissionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const [missions, players, leaderboard] = await Promise.all([
    db.mission.findMany({
      where: { clubId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { playerMissions: true } } },
    }),
    db.player.findMany({
      where: { clubId, status: "ACTIVE" },
      orderBy: { user: { name: "asc" } },
      select: { id: true, xp: true, user: { select: { name: true } } },
    }),
    db.player.findMany({
      where: { clubId, status: "ACTIVE" },
      orderBy: { xp: "desc" },
      take: 8,
      include: { user: { select: { name: true, avatar: true } } },
    }),
  ]);

  const typeLabel: Record<string, string> = {
    DAILY: "Diaria",
    WEEKLY: "Semanal",
    CHALLENGE: "Reto",
    SPECIAL: "Especial",
  };

  return (
    <div>
      <Header title="Arise System" subtitle="Asigna misiones y gestiona el progreso de tus jugadores" />
      <div className="p-4 md:p-8 space-y-6">

        {/* Assign / XP panel */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Flame size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold text-lg">Acciones rápidas</h2>
          </div>
          <GamificationActions
            players={players.map((p) => ({ id: p.id, name: p.user.name, xp: p.xp }))}
            missions={missions.map((m) => ({ id: m.id, title: m.title, xpReward: m.xpReward, type: m.type }))}
            showCustomTab={true}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Leaderboard */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Ranking XP</h2>
              <Trophy size={18} style={{ color: "var(--warning)" }} />
            </div>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                  No hay jugadores todavía.
                </p>
              ) : (
                leaderboard.map((player, i) => {
                  const level = calculateLevel(player.xp);
                  const progress = xpProgress(player.xp, level);
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold w-6 text-right"
                        style={{
                          color: i === 0 ? "var(--warning)" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--text-muted)",
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
                          <ProgressBar value={progress} max={100} height="sm" animated={false} className="flex-1" />
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

          {/* Active missions list */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Misiones activas</h2>
              <Target size={18} style={{ color: "var(--info)" }} />
            </div>
            <div className="space-y-3">
              {missions.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                  No hay misiones creadas aún.
                </p>
              ) : (
                missions.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(0,255,135,0.1)" }}
                    >
                      <Target size={16} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {typeLabel[m.type] ?? m.type} · {m._count.playerMissions} asignaciones
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                      <Zap size={11} />
                      {m.xpReward}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
