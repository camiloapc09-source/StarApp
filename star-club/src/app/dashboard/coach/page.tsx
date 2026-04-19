import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import EvidencePanel from "@/components/coach/evidence-panel";
import { getDictionary } from "@/lib/dict";
import { Users, Calendar, UserCheck, BarChart3 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function CoachDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/");
  const dict = await getDictionary();

  const [sessionsCount, playersCount, recentSessions, upcomingSessions, pendingEvidences, unreadNotifications] =
    await Promise.all([
      db.session.count({ where: { coachId: session.user.id } }),
      db.player.count({ where: { status: "ACTIVE" } }),
      db.session.findMany({
        take: 5,
        where: { coachId: session.user.id },
        orderBy: { date: "desc" },
        include: { category: true, _count: { select: { attendances: true } } },
      }),
      db.session.findMany({
        take: 3,
        where: { coachId: session.user.id, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        include: { category: true },
      }),
      db.evidence.findMany({
        where: { status: "PENDING" },
        include: { player: { include: { user: true } }, playerMission: { include: { mission: true } } },
        orderBy: { submittedAt: "desc" },
        take: 20,
      }),
      db.notification.count({ where: { userId: session.user.id, isRead: false } }),
    ]);

  return (
    <div>
      <Header
        title={dict.header.coachTitle}
        subtitle={dict.header.coachSubtitle.replace("{name}", session.user.name ?? "")}
        notificationCount={unreadNotifications}

      />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={dict.common.activePlayers} value={playersCount} icon={<Users size={20} />} iconColor="text-accent" />
          <StatCard label={dict.coach?.mySessions ?? dict.common.sessions} value={sessionsCount} icon={<Calendar size={20} />} iconColor="text-info" />
          <StatCard
            label={dict.coach?.upcomingSessions ?? "Upcoming"}
            value={upcomingSessions.length}
            icon={<UserCheck size={20} />}
            iconColor="text-warning"
          />
          <StatCard
            label={dict.coach?.recentSessions ?? "Recent"}
            value={recentSessions.length}
            icon={<BarChart3 size={20} />}
            iconColor="text-success"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sessions */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">{dict.coach?.recentSessions ?? dict.common.recentPlayers}</h2>
                <Link href="/dashboard/coach/sessions" className="text-sm text-accent hover:text-accent-dim">
                  {dict.coach?.allSessionsLink ?? dict.common.viewAll}
                </Link>
              </div>
              <div className="space-y-3">
                {recentSessions.length === 0 ? (
                  <p className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
                    {dict.coach?.noSessionsYet ?? dict.player.noSessionsThisMonth}
                  </p>
                ) : (
                  recentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex flex-col items-center justify-center">
                        <span className="text-xs font-bold leading-none">{format(new Date(s.date), "dd")}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(s.date), "MMM")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {s.category?.name || dict.coach?.allCategories} · {s._count.attendances} {dict.coach?.present}
                        </p>
                      </div>
                      <Badge
                        variant={s.type === "MATCH" ? "warning" : s.type === "EVENT" ? "info" : "default"}
                      >
                        {s.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions + Evidence */}
          <div className="space-y-6">
            {/* Upcoming */}
            <Card>
              <h2 className="font-semibold mb-4">{dict.coach?.upcomingSessions}</h2>
              <div className="space-y-3">
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {dict.coach?.noUpcoming ?? "No upcoming sessions."}
                  </p>
                ) : (
                  upcomingSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(s.date), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Evidence panel */}
            <Card>
              <h2 className="font-semibold mb-4">{dict.evidence.pendingTitle}</h2>
              <EvidencePanel initialEvidences={pendingEvidences} t={dict.evidence} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
