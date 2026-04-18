import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPProgressCard } from "@/components/gamification/xp-progress-card";
import { calculateLevel } from "@/lib/utils";
import { Trophy, Lock, CheckCircle2, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function PlayerRewardsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/login");

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      rewards: {
        include: { reward: true },
        orderBy: { earnedAt: "desc" },
      },
    },
  });

  if (!player) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Perfil no encontrado. Contacta con tu administrador.</p>
      </div>
    );
  }

  // All rewards in the system for this club
  const allRewards = await db.reward.findMany({ where: { clubId: player.clubId }, orderBy: { levelRequired: "asc" } });

  const level = calculateLevel(player.xp);
  const earnedIds = new Set(player.rewards.map((r) => r.rewardId));

  const earnedRewards = player.rewards;
  const lockedRewards = allRewards.filter((r) => !earnedIds.has(r.id));

  return (
    <div>
      <Header
        title="Mis recompensas"
        subtitle={`${earnedRewards.length} recompensa${earnedRewards.length !== 1 ? "s" : ""} desbloqueada${earnedRewards.length !== 1 ? "s" : ""}`}
      />
      <div className="p-8 space-y-6">

        {/* XP card */}
        <XPProgressCard xp={player.xp} level={level} streak={player.streak} />

        {/* Earned rewards */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <Trophy size={18} style={{ color: "var(--warning)" }} />
            <h2 className="font-semibold">Recompensas obtenidas</h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)" }}
            >
              {earnedRewards.length}
            </span>
          </div>

          {earnedRewards.length === 0 ? (
            <div className="text-center py-10">
              <Trophy size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                ¡Completa misiones para desbloquear recompensas!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {earnedRewards.map(({ id, reward, earnedAt }) => (
                <div
                  key={id}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{
                    background: "rgba(0,255,135,0.05)",
                    borderColor: "rgba(0,255,135,0.2)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "rgba(0,255,135,0.1)" }}
                  >
                    {reward.icon ?? "🏆"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{reward.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {reward.description}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--success)" }}>
                      <CheckCircle2 size={10} className="inline mr-1" />
                      {format(new Date(earnedAt), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Locked rewards */}
        {lockedRewards.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <Lock size={18} style={{ color: "var(--text-muted)" }} />
              <h2 className="font-semibold">Por desbloquear</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lockedRewards.map((reward) => {
                const unlocked = level >= reward.levelRequired;
                return (
                  <div
                    key={reward.id}
                    className="flex items-center gap-3 p-4 rounded-xl border opacity-60"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 grayscale"
                      style={{ background: "var(--bg-hover)" }}
                    >
                      {reward.icon ?? "🎁"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{reward.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {reward.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={10} style={{ color: "var(--warning)" }} />
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          Requiere nivel {reward.levelRequired}
                          {unlocked ? " — ¡completada misión pendiente!" : ` (tu nivel: ${level})`}
                        </p>
                      </div>
                    </div>
                    {unlocked ? (
                      <Badge variant="warning">Listo</Badge>
                    ) : (
                      <Lock size={14} style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
