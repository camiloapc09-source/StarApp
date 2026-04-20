import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPProgressCard } from "@/components/gamification/xp-progress-card";
import { MissionsList } from "@/components/gamification/missions-list";
import { UpcomingSessionsCard } from "@/components/shared/upcoming-sessions-card";
import { Calendar, Trophy, Zap, ArrowRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default async function PlayerDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/");

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
      <div className="p-4 md:p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Tu perfil de jugador no está configurado aún.</p>
      </div>
    );
  }

  const [unreadNotifications, totalSessions, clubPlayers] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
    db.session.count({
      where: {
        // Only count sessions for this player's category, not all club sessions
        ...(player.categoryId ? { categoryId: player.categoryId } : {}),
        date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
      },
    }),
    db.player.findMany({
      where: { clubId: player.clubId, status: "ACTIVE" },
      select: { id: true, xp: true },
      orderBy: { xp: "desc" },
    }),
  ]);

  const myRank       = clubPlayers.findIndex((p) => p.id === player.id) + 1;
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

  const activeMissions = missions.filter((m) => m.status === "ACTIVE").length;
  const firstName = session.user.name?.split(" ")[0] ?? "";

  return (
    <div>
      <Header title="Inicio" notificationCount={unreadNotifications} />

      <div className="p-4 md:p-8 space-y-5">

        {/* Greeting banner */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.28) 0%, rgba(49,46,129,0.20) 50%, rgba(12,10,36,0.80) 100%)",
            border: "1px solid rgba(139,92,246,0.20)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 90% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-1 relative" style={{ color: "rgba(167,139,250,0.70)" }}>
            {getGreeting()}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white relative">{firstName} ⚡</h2>
          <div className="flex items-center gap-3 mt-2 relative flex-wrap">
            <span className="flex items-center gap-1 text-sm font-bold" style={{ color: "#A78BFA" }}>
              <Zap size={13} />{player.xp.toLocaleString("es-CO")} XP
            </span>
            {myRank > 0 && (
              <>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
                <Link href="/dashboard/player/stats"
                  className="text-sm font-bold flex items-center gap-1"
                  style={{ color: "#FCD34D" }}>
                  #{myRank} del club <ArrowRight size={12} />
                </Link>
              </>
            )}
            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {activeMissions > 0
                ? `${activeMissions} misión${activeMissions !== 1 ? "es" : ""} activa${activeMissions !== 1 ? "s" : ""}`
                : "Sin misiones activas"}
            </span>
          </div>
        </div>

        {/* XP card + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <XPProgressCard
              xp={player.xp}
              streak={player.streak}
              rank={myRank > 0 ? myRank : undefined}
              totalPlayers={clubPlayers.length}
            />

            {/* Attendance */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[14px]">Asistencia</h2>
                <Calendar size={15} style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-black">{attendanceRate}%</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>este mes</span>
              </div>
              <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 5, background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${attendanceRate}%`,
                    background: attendanceRate >= 80 ? "var(--success)" : attendanceRate >= 60 ? "var(--warning)" : "var(--error)",
                  }} />
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>{presentCount} presentes</span>
                <span>{totalSessions} total</span>
              </div>
            </Card>

            {/* Rewards */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[14px]">Logros</h2>
                <Trophy size={15} style={{ color: "var(--warning)" }} />
              </div>
              {player.rewards?.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>¡Completa misiones para ganar logros!</p>
              ) : (
                <div className="space-y-2">
                  {player.rewards?.map((pr: any) => (
                    <div key={pr.id} className="flex items-center gap-3">
                      <span className="text-xl">{pr.reward.icon || "🏆"}</span>
                      <div>
                        <p className="text-sm font-semibold">{pr.reward.title}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(pr.earnedAt), "d MMM", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Missions */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-[15px]">Mis misiones</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Completa misiones y gana XP</p>
                </div>
                <Badge variant="accent">{activeMissions} activas</Badge>
              </div>
              <MissionsList missions={missions} />
            </Card>
          </div>
        </div>

        {/* Upcoming sessions */}
        <UpcomingSessionsCard categoryId={player.categoryId} />

        {/* Recent attendance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[14px]">Sesiones recientes</h2>
            <Calendar size={15} style={{ color: "var(--accent)" }} />
          </div>
          <div className="space-y-1.5">
            {player.attendances?.length === 0 ? (
              <p className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>Sin sesiones registradas este mes.</p>
            ) : (
              player.attendances?.slice(0, 8).map((att: any) => (
                <div key={att.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: att.status === "PRESENT" ? "var(--success)"
                          : att.status === "LATE" ? "var(--warning)"
                          : att.status === "EXCUSED" ? "var(--info)" : "var(--error)",
                      }} />
                    <span className="text-sm truncate">{att.session.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(att.session.date), "d MMM", { locale: es })}
                    </span>
                    <Badge variant={
                      att.status === "PRESENT" ? "success"
                        : att.status === "LATE" ? "warning"
                        : att.status === "EXCUSED" ? "info" : "error"
                    }>
                      {att.status === "PRESENT" ? "Presente"
                        : att.status === "LATE" ? "Tarde"
                        : att.status === "EXCUSED" ? "Excusado" : "Ausente"}
                    </Badge>
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
