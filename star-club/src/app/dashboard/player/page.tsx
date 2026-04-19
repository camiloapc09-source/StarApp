import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { getDictionary } from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPProgressCard } from "@/components/gamification/xp-progress-card";
import { MissionsList } from "@/components/gamification/missions-list";
import { UpcomingSessionsCard } from "@/components/shared/upcoming-sessions-card";
import { Calendar, CheckCircle2, Trophy } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default async function PlayerDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/");

  const dict = await getDictionary();

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      category: true,
      playerMissions: { include: { mission: true }, orderBy: { assignedAt: "desc" }, take: 10 },
      rewards: { include: { reward: true }, take: 5 },
      attendances: {
        include: { session: true },
        where: {
          session: { date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } },
        },
      },
    },
  });

  if (!player) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>{dict.player.profileNotSet}</p>
      </div>
    );
  }

  const unreadNotifications = await db.notification.count({ where: { userId: session.user.id, isRead: false } });

  const totalSessions = await db.session.count({
    where: { date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } },
  });

  const presentCount = player.attendances?.filter((a: any) => a.status === "PRESENT").length || 0;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const missions = player.playerMissions?.map((pm: any) => ({
    id: pm.id,
    title: pm.mission.title,
    description: pm.mission.description,
    xpReward: pm.mission.xpReward,
    type: pm.mission.type,
    status: pm.status,
    progress: pm.progress,
    target: pm.target,
  })) || [];

  return (
    <div>
      <Header
        title={dict.header.playerTitleTemplate.replace("{firstName}", session.user.name?.split(" ")[0] ?? "")}
        subtitle={dict.header.playerSubtitle}

        notificationCount={unreadNotifications}
      />

      <div className="p-8 space-y-6">
        {/* Upcoming sessions calendar */}
        <UpcomingSessionsCard categoryId={player.categoryId} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <XPProgressCard xp={player.xp} level={player.level} streak={player.streak} />

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{dict.player.attendanceTitle}</h2>
                <Calendar size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-black">{attendanceRate}%</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{dict.player.thisMonth}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "var(--bg-elevated)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${attendanceRate}%`,
                    background: attendanceRate >= 80 ? "var(--success)" : attendanceRate >= 60 ? "var(--warning)" : "var(--error)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{presentCount} sessions attended</span>
                <span>{totalSessions} total</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{dict.player.rewardsHeading}</h2>
                <Trophy size={18} style={{ color: "var(--warning)" }} />
              </div>
              {player.rewards?.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{dict.player.noRewards}</p>
              ) : (
                <div className="space-y-2">
                  {player.rewards?.map((pr: any) => (
                    <div key={pr.id} className="flex items-center gap-3">
                      <span className="text-2xl">{pr.reward.icon || "🏆"}</span>
                      <div>
                        <p className="text-sm font-medium">{pr.reward.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(pr.earnedAt), "MMM dd")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-lg">{dict.player.myMissionsTitle}</h2>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{dict.player.myMissionsSubtitle}</p>
                </div>
                <Badge variant="accent">{missions.filter((m) => m.status === "ACTIVE").length} active</Badge>
              </div>
              <MissionsList missions={missions} />
            </Card>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">{dict.player.recentSessionsTitle}</h2>
            <CheckCircle2 size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div className="space-y-2">
            {player.attendances?.length === 0 ? (
              <p className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>{dict.player.noSessionsThisMonth}</p>
            ) : (
              player.attendances?.slice(0, 8).map((att: any) => (
                <div key={att.id} className="flex items-center justify-between py-2 px-4 rounded-xl hover:bg-[var(--bg-hover)] transition-all">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          att.status === "PRESENT"
                            ? "var(--success)"
                            : att.status === "LATE"
                            ? "var(--warning)"
                            : att.status === "EXCUSED"
                            ? "var(--info)"
                            : "var(--error)",
                      }}
                    />
                    <span className="text-sm">{att.session.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(att.session.date), "MMM dd")}</span>
                    <Badge variant={att.status === "PRESENT" ? "success" : att.status === "LATE" ? "warning" : att.status === "EXCUSED" ? "info" : "error"}>{att.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
