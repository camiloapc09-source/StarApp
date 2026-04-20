import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { XPProgressCard } from "@/components/gamification/xp-progress-card";
import { Leaderboard } from "@/components/gamification/leaderboard";
import { calculateLevel, LEVEL_TITLES } from "@/lib/utils";
import { Calendar, CheckCircle2, XCircle, Clock, Flame, Trophy } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default async function PlayerStatsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLAYER") redirect("/");

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      category: true,
      attendances: {
        include: { session: { select: { id: true, title: true, date: true, type: true } } },
        orderBy: { session: { date: "desc" } },
        take: 30,
      },
    },
  });

  if (!player) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>Perfil no encontrado. Contacta con tu administrador.</p>
      </div>
    );
  }

  // Leaderboard: top 20 players in same club by XP
  const leaderboardPlayers = await db.player.findMany({
    where: { clubId: player.clubId, status: "ACTIVE" },
    select: { id: true, xp: true, user: { select: { name: true } } },
    orderBy: { xp: "desc" },
    take: 20,
  });

  const sorted  = [...leaderboardPlayers].sort((a, b) => b.xp - a.xp);
  const myRank  = sorted.findIndex((p) => p.id === player.id) + 1;
  const level   = calculateLevel(player.xp);

  // Attendance stats
  const totalSessions = player.attendances.length;
  const presentCount  = player.attendances.filter((a) => a.status === "PRESENT").length;
  const lateCount     = player.attendances.filter((a) => a.status === "LATE").length;
  const absentCount   = player.attendances.filter((a) => a.status === "ABSENT").length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const now = new Date();
  const monthStats = Array.from({ length: 4 }, (_, i) => {
    const ref    = subMonths(now, 3 - i);
    const start  = startOfMonth(ref);
    const end    = endOfMonth(ref);
    const inMonth = player.attendances.filter((a) => {
      const d = new Date(a.session.date);
      return d >= start && d <= end;
    });
    const present = inMonth.filter((a) => a.status === "PRESENT").length;
    const total   = inMonth.length;
    return { label: format(ref, "MMM", { locale: es }), present, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
  });

  const statusIcon: Record<string, React.ReactNode> = {
    PRESENT: <CheckCircle2 size={14} style={{ color: "var(--success)" }} />,
    LATE:    <Clock size={14} style={{ color: "var(--warning)" }} />,
    ABSENT:  <XCircle size={14} style={{ color: "var(--error)" }} />,
    EXCUSED: <Clock size={14} style={{ color: "var(--info)" }} />,
  };
  const statusLabel: Record<string, string> = {
    PRESENT: "Presente", LATE: "Tarde", ABSENT: "Ausente", EXCUSED: "Justificado",
  };
  const typeLabel: Record<string, string> = {
    TRAINING: "Entrenamiento", MATCH: "Partido", EVENT: "Evento",
  };

  return (
    <div>
      <Header title="Mis estadísticas" subtitle="Progreso, asistencia y ranking" />
      <div className="p-4 md:p-8 space-y-5">

        {/* XP card with rank */}
        <XPProgressCard
          xp={player.xp}
          streak={player.streak}
          rank={myRank > 0 ? myRank : undefined}
          totalPlayers={leaderboardPlayers.length}
        />

        {/* Attendance stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Sesiones",  value: totalSessions, color: "var(--text-primary)"  },
            { label: "Presente",  value: presentCount,  color: "var(--success)"       },
            { label: "Tarde",     value: lateCount,     color: "var(--warning)"       },
            { label: "Ausente",   value: absentCount,   color: "var(--error)"         },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-4">
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] mt-1 uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
            </Card>
          ))}
        </div>

        {/* Monthly trend */}
        <Card>
          <h2 className="font-bold text-[14px] mb-4 flex items-center gap-2">
            <Flame size={15} style={{ color: "#FF6B35" }} />
            Asistencia por mes
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {monthStats.map(({ label, rate, present, total }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black"
                  style={{ color: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--error)" }}>
                  {rate}%
                </p>
                <p className="text-xs font-semibold capitalize mt-0.5">{label}</p>
                <p className="text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>{present}/{total}</p>
                <ProgressBar value={rate} max={100} height="sm" animated={false} />
              </div>
            ))}
          </div>
        </Card>

        {/* Leaderboard */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} style={{ color: "#FCD34D" }} />
            <h2 className="font-bold text-[14px]">Ranking del club</h2>
            {myRank > 0 && (
              <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA" }}>
                #{myRank}
              </span>
            )}
          </div>
          <Leaderboard players={leaderboardPlayers} currentPlayerId={player.id} />
        </Card>

        {/* Session history */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-primary)" }}>
            <Calendar size={15} style={{ color: "var(--accent)" }} />
            <h2 className="font-bold text-[14px]">Historial de sesiones</h2>
            <span className="ml-auto text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {attendanceRate}% asistencia
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {player.attendances.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                Aún no hay sesiones registradas.
              </p>
            ) : (
              player.attendances.map((att) => (
                <div key={att.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-shrink-0">{statusIcon[att.status] ?? statusIcon.ABSENT}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.session.title}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(att.session.date), "EEEE dd MMM yyyy", { locale: es })}
                      {" · "}{typeLabel[att.session.type] ?? att.session.type}
                    </p>
                  </div>
                  <Badge variant={
                    att.status === "PRESENT" ? "success" :
                    att.status === "LATE"    ? "warning" :
                    att.status === "EXCUSED" ? "default" : "error"
                  }>
                    {statusLabel[att.status] ?? att.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
