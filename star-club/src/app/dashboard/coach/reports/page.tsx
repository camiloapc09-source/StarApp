import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateLevel } from "@/lib/utils";
import { Users, Calendar, UserCheck, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default async function CoachReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") redirect("/login");

  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  const [
    totalSessions,
    totalPlayers,
    recentSessions,
    attendanceData,
    topPlayers,
  ] = await Promise.all([
    db.session.count({ where: { coachId: session.user.id } }),
    db.player.count({ where: { status: "ACTIVE" } }),
    db.session.findMany({
      where: { coachId: session.user.id, date: { gte: sixMonthsAgo } },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        category: true,
        attendances: { select: { status: true } },
      },
    }),
    db.attendance.findMany({
      where: {
        session: { coachId: session.user.id, date: { gte: sixMonthsAgo } },
      },
      select: { status: true },
    }),
    db.player.findMany({
      where: { status: "ACTIVE" },
      orderBy: { xp: "desc" },
      take: 8,
      include: { user: { select: { name: true, avatar: true } }, category: true },
    }),
  ]);

  const totalAttendance  = attendanceData.length;
  const presentCount     = attendanceData.filter((a) => a.status === "PRESENT").length;
  const lateCount        = attendanceData.filter((a) => a.status === "LATE").length;
  const absentCount      = attendanceData.filter((a) => a.status === "ABSENT").length;
  const attendanceRate   = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";
  const typeLabel: Record<string, string> = { TRAINING: "Entrenamiento", MATCH: "Partido", EVENT: "Evento" };
  const typeVariant: Record<string, BadgeVariant> = { TRAINING: "default", MATCH: "warning", EVENT: "success" };

  return (
    <div>
      <Header title="Reportes" subtitle="Estadísticas de tus sesiones y jugadores" />
      <div className="p-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Sesiones totales" value={totalSessions} icon={<Calendar size={20} />} iconColor="text-info" />
          <StatCard label="Jugadores activos" value={totalPlayers} icon={<Users size={20} />} iconColor="text-accent" />
          <StatCard label="Tasa de asistencia" value={`${attendanceRate}%`} icon={<UserCheck size={20} />} iconColor="text-success" />
          <StatCard label="Registros (6 meses)" value={totalAttendance} icon={<BarChart3 size={20} />} iconColor="text-warning" />
        </div>

        {/* Attendance breakdown */}
        <Card>
          <h2 className="font-semibold mb-5">Desglose de asistencia (últimos 6 meses)</h2>
          {totalAttendance === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              No hay registros de asistencia aún.
            </p>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Presente", count: presentCount, color: "var(--success)", variant: "success" as const },
                { label: "Tarde",    count: lateCount,    color: "var(--warning)", variant: "warning" as const },
                { label: "Ausente",  count: absentCount,  color: "var(--error)",   variant: "error"   as const },
              ].map(({ label, count, color, variant }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-sm w-16" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={count}
                      max={totalAttendance}
                      height="md"
                      animated={false}
                    />
                  </div>
                  <Badge variant={variant}>{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent sessions */}
          <Card>
            <h2 className="font-semibold mb-5">Sesiones recientes</h2>
            <div className="space-y-3">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                  No hay sesiones en los últimos 6 meses.
                </p>
              ) : (
                recentSessions.map((s) => {
                  const present = s.attendances.filter((a) => a.status === "PRESENT").length;
                  const total   = s.attendances.length;
                  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{s.title}</p>
                          <Badge variant={typeVariant[s.type] ?? "default"}>
                            {typeLabel[s.type] ?? s.type}
                          </Badge>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(s.date), "dd MMM yyyy", { locale: es })}
                          {s.category ? ` · ${s.category.name}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">{rate}%</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{present}/{total}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Top players by XP */}
          <Card>
            <h2 className="font-semibold mb-5">Top jugadores por XP</h2>
            <div className="space-y-3">
              {topPlayers.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                  No hay jugadores todavía.
                </p>
              ) : (
                topPlayers.map((player, i) => {
                  const level = calculateLevel(player.xp);
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold w-5 text-right flex-shrink-0"
                        style={{
                          color: i === 0 ? "var(--warning)" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <Avatar name={player.user.name} src={player.user.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{player.user.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {player.category?.name ?? "Sin categoría"} · Lv.{level}
                        </p>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
                        {player.xp} XP
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
