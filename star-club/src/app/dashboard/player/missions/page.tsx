import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlayerMissionsClient from "@/components/gamification/player-missions-client";

export default async function PlayerMissionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/");

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      xp: true,
      level: true,
      playerMissions: {
        include: {
          mission: true,
          evidences: { orderBy: { submittedAt: "desc" }, take: 1 },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!player) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Perfil no encontrado.</p>
      </div>
    );
  }

  const active    = player.playerMissions.filter((m) => m.status === "ACTIVE");
  const completed = player.playerMissions.filter((m) => m.status === "COMPLETED");
  const expired   = player.playerMissions.filter((m) => m.status === "EXPIRED");

  return (
    <div>
      <Header
        title="Mis misiones"
        subtitle={`${active.length} activa${active.length !== 1 ? "s" : ""} · ${completed.length} completada${completed.length !== 1 ? "s" : ""}`}
      />
      <div className="p-4 md:p-8 space-y-6">
        {/* Active missions */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lg">Misiones activas</h2>
            <Badge variant="accent">{active.length}</Badge>
          </div>
          <PlayerMissionsClient
            missions={active.map((pm) => ({
              playerMissionId: pm.id,
              missionId: pm.missionId,
              title: pm.mission.title,
              description: pm.mission.description,
              xpReward: pm.mission.xpReward,
              type: pm.mission.type,
              progress: pm.progress,
              target: pm.target,
              latestEvidenceStatus: pm.evidences[0]?.status ?? null,
            }))}
          />
        </Card>

        {/* Completed missions */}
        {completed.length > 0 && (
          <Card>
            <h2 className="font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
              Completadas ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <span className="text-lg">✅</span>
                  <span className="text-sm flex-1">{pm.mission.title}</span>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                    +{pm.mission.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Empty state */}
        {player.playerMissions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <p className="font-medium mb-1">No tienes misiones asignadas</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Tu entrenador te asignará misiones pronto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
