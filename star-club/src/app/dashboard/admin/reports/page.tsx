import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateLevel, LEVEL_TITLES, formatCurrency } from "@/lib/utils";
import { Users, CreditCard, BarChart3, Trophy, TrendingUp, Download } from "lucide-react";
import Link from "next/link";
import { AttendanceChart, RevenueChart, PaymentPieChart } from "@/components/admin/report-charts";

export default async function AdminReportsPage() {
  const t = await getDictionary();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalPlayers,
    totalRevenue,
    pendingRevenue,
    attendanceData,
    topPlayers,
    paymentStats,
    recentAttendances,
    recentPayments,
  ] = await Promise.all([
    db.player.count({ where: { clubId, status: "ACTIVE" } }),
    db.payment.aggregate({
      where: { clubId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { clubId, status: "PENDING" },
      _sum: { amount: true },
    }),
    db.attendance.groupBy({ by: ["status"], _count: true, where: { session: { clubId } } }),
    db.player.findMany({
      where: { clubId },
      orderBy: { xp: "desc" },
      take: 10,
      include: { user: { select: { name: true, avatar: true } }, category: true },
    }),
    db.payment.groupBy({ by: ["status"], _count: true, _sum: { amount: true }, where: { clubId } }),
    db.attendance.findMany({
      where: { session: { clubId, date: { gte: sixMonthsAgo } } },
      select: { status: true, session: { select: { date: true } } },
    }),
    db.payment.findMany({
      where: { clubId, createdAt: { gte: sixMonthsAgo } },
      select: { status: true, amount: true, createdAt: true },
    }),
  ]);

  // Build last-6-months labels
  const monthKeys: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthKeys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("es-CO", { month: "short" }),
    });
  }
  const fmtMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const attendanceByMonth = monthKeys.map(({ key, label }) => {
    const records = recentAttendances.filter((a) => fmtMonth(a.session.date) === key);
    return {
      month: label,
      present: records.filter((r) => r.status === "PRESENT").length,
      late:    records.filter((r) => r.status === "LATE").length,
      absent:  records.filter((r) => r.status === "ABSENT").length,
    };
  });

  const revenueByMonth = monthKeys.map(({ key, label }) => ({
    month: label,
    collected: recentPayments
      .filter((p) => fmtMonth(p.createdAt) === key && p.status === "COMPLETED")
      .reduce((s, p) => s + p.amount, 0),
    pending: recentPayments
      .filter((p) => fmtMonth(p.createdAt) === key && p.status !== "COMPLETED")
      .reduce((s, p) => s + p.amount, 0),
  }));

  const paymentPieData = paymentStats.map((s) => ({
    name: s.status === "COMPLETED" ? "Pagado" : s.status === "PENDING" ? "Pendiente" : "Vencido",
    value: s._count,
    color: s.status === "COMPLETED" ? "var(--success)" : s.status === "PENDING" ? "var(--warning)" : "var(--error)",
  }));

  const presentCount = attendanceData.find((a) => a.status === "PRESENT")?._count || 0;
  const totalAttendance = attendanceData.reduce((s, a) => s + a._count, 0);
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return (
    <div>
      <Header title={t.common.reports} subtitle={t.reports?.totalRevenue ?? ""} />
      <div className="p-4 md:p-8 space-y-8">
        {/* Export button */}
        <div className="flex justify-end">
          <Link
            href="/api/reports/export?type=players"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            <Download size={14} /> Exportar CSV
          </Link>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t.common.activePlayers} value={totalPlayers} icon={<Users size={20} />} gradient="linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.12))" />
          <StatCard
            label={t.reports.totalRevenue}
            value={formatCurrency(totalRevenue._sum.amount || 0)}
            icon={<CreditCard size={20} />}
            gradient="linear-gradient(135deg, rgba(96,165,250,0.22), rgba(59,130,246,0.10))"
          />
          <StatCard
            label={t.reports.avgAttendance}
            value={`${attendanceRate}%`}
            icon={<BarChart3 size={20} />}
            gradient="linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.10))"
          />
          <StatCard
            label={t.reports.pendingRevenue}
            value={formatCurrency(pendingRevenue._sum.amount || 0)}
            icon={<TrendingUp size={20} />}
            gradient="linear-gradient(135deg, rgba(239,68,68,0.22), rgba(220,38,38,0.10))"
          />
        </div>

        {/* Monthly charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="font-semibold mb-4">Asistencia mensual</h2>
            <AttendanceChart data={attendanceByMonth} />
          </Card>
          <Card>
            <h2 className="font-semibold mb-4">Ingresos mensuales</h2>
            <RevenueChart data={revenueByMonth} />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top performers */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">{t.reports.topPerformers}</h2>
              <Trophy size={18} style={{ color: "var(--warning)" }} />
            </div>
            <div className="space-y-4">
              {topPlayers.map((player, i) => {
                const level = calculateLevel(player.xp);
                return (
                  <div key={player.id} className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold w-5 text-center"
                      style={{
                        color:
                          i === 0
                            ? "#ffd700"
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
                        <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                          {player.xp} XP · Lv{level}
                        </span>
                      </div>
                      <ProgressBar
                        value={(level / 10) * 100}
                        max={100}
                        height="sm"
                        animated={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Attendance breakdown + Payment breakdown */}
          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold mb-4">{t.reports.attendanceBreakdown}</h2>
              <div className="space-y-3">
                {attendanceData.map((item) => {
                  const pct =
                    totalAttendance > 0
                      ? Math.round((item._count / totalAttendance) * 100)
                      : 0;
                  const colors: Record<string, string> = {
                    PRESENT: "var(--success)",
                    ABSENT: "var(--error)",
                    LATE: "var(--warning)",
                    EXCUSED: "var(--info)",
                  };
                  return (
                    <div key={item.status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "var(--text-secondary)" }}>{(t.attendanceStatus as any)?.[item.status] ?? item.status}</span>
                        <span className="font-medium">
                          {item._count} ({pct}%)
                        </span>
                      </div>
                      <ProgressBar
                        value={pct}
                        max={100}
                        height="sm"
                        animated={false}
                        color=""
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold mb-4">{t.reports.paymentStatus}</h2>
              <PaymentPieChart data={paymentPieData} />
              <div className="space-y-2 mt-2">
                {paymentStats.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {item.status === "COMPLETED" ? "Pagado" : item.status === "PENDING" ? "Pendiente" : "Vencido"}
                    </span>
                    <span className="text-sm font-bold">
                      {formatCurrency(item._sum?.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
