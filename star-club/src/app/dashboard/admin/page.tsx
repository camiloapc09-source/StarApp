import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Users, CreditCard, TrendingUp, UserCheck, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default async function AdminDashboard() {
  const t = await getDictionary();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";
  const firstName = session.user.name?.split(" ")[0] ?? "";

  const [
    totalPlayers,
    pendingPlayers,
    completedPayments,
    pendingPayments,
    categories,
    recentPlayers,
    overduePayments,
    totalSessions,
    unreadNotifications,
  ] = await Promise.all([
    db.player.count({ where: { clubId, status: "ACTIVE" } }),
    db.player.count({ where: { clubId, status: "PENDING" } }),
    db.payment.count({ where: { clubId, status: "COMPLETED" } }),
    db.payment.count({ where: { clubId, status: "PENDING" } }),
    db.category.findMany({ where: { clubId }, include: { _count: { select: { players: true } } } }),
    db.player.findMany({
      where: { clubId },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: true, category: true },
    }),
    db.payment.count({ where: { clubId, status: "OVERDUE" } }),
    db.session.count({ where: { clubId } }),
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  const quickActions = [
    { label: "Nuevo jugador",   href: "/dashboard/admin/players/new",      emoji: "👤" },
    { label: "Entrenadores",    href: "/dashboard/admin/coaches",           emoji: "🏋️" },
    { label: "Nueva sesión",    href: "/dashboard/admin/attendance/new",    emoji: "📅" },
    { label: "Registrar pago",  href: "/dashboard/admin/payments/new",      emoji: "💳" },
    { label: "Reportes",        href: "/dashboard/admin/reports",           emoji: "📊" },
    { label: "Gamificación",    href: "/dashboard/admin/gamification",      emoji: "🏆" },
  ];

  return (
    <div>
      <Header title={t.common.adminDashboard ?? t.common.dashboard} subtitle={t.common?.adminSubtitle ?? ""} notificationCount={unreadNotifications} />

      <div className="p-4 md:p-8 space-y-6">

        {/* Greeting banner */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.28) 0%, rgba(49,46,129,0.20) 50%, rgba(12,10,36,0.80) 100%)",
            border: "1px solid rgba(139,92,246,0.20)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 80% at 90% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)",
            }}
          />
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-1 relative" style={{ color: "rgba(167,139,250,0.70)" }}>
            {getGreeting()}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white relative">{firstName} 👋</h2>
          <p className="text-sm mt-1 relative" style={{ color: "rgba(255,255,255,0.45)" }}>
            {overduePayments > 0
              ? `Tienes ${overduePayments} pago${overduePayments !== 1 ? "s" : ""} vencido${overduePayments !== 1 ? "s" : ""} — revísalos hoy.`
              : `Todo al día · ${totalPlayers} jugadores activos en el club.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t.common.activePlayers}
            value={totalPlayers}
            icon={<Users size={18} style={{ color: "#A78BFA" }} />}
            gradient="linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.12))"
          />
          <StatCard
            label={t.common.pendingPlayers}
            value={pendingPlayers}
            icon={<UserCheck size={18} style={{ color: "#FCD34D" }} />}
            gradient="linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.10))"
          />
          <StatCard
            label={t.common.paidThisMonth}
            value={completedPayments}
            icon={<CreditCard size={18} style={{ color: "#60A5FA" }} />}
            gradient="linear-gradient(135deg, rgba(96,165,250,0.22), rgba(59,130,246,0.10))"
          />
          <StatCard
            label={t.common.overduePayments}
            value={overduePayments}
            icon={<TrendingUp size={18} style={{ color: "#F87171" }} />}
            gradient="linear-gradient(135deg, rgba(239,68,68,0.22), rgba(220,38,38,0.10))"
          />
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
            Acciones rápidas
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl text-center transition-all duration-200 group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.10)";
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {a.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Players */}
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h2 className="font-bold text-[15px]">{t.common.recentPlayers}</h2>
                <Link
                  href="/dashboard/admin/players"
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: "rgba(167,139,250,0.75)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#A78BFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.75)")}
                >
                  {t.common.viewAll} <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {recentPlayers.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>{t.common.noPlayersYet}</p>
                ) : (
                  recentPlayers.map((player) => (
                    <Link key={player.id} href={`/dashboard/admin/players/${player.id}`}>
                      <div
                        className="flex items-center gap-3.5 px-5 py-3.5 transition-all duration-150"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Avatar name={player.user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{player.user.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {player.category?.name || "Sin categoría"} · #{player.jerseyNumber || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#A78BFA" }}>
                            <Zap size={11} />
                            {player.xp} XP
                          </div>
                          <Badge variant={player.status === "ACTIVE" ? "success" : player.status === "PENDING" ? "warning" : "default"}>
                            {player.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Categories */}
            <Card>
              <h2 className="font-bold text-[15px] mb-4">{t.common.categories}</h2>
              <div className="space-y-2.5">
                {categories.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.common.noCategories}</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#C4B5FD" }}
                      >
                        {cat._count.players}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Overview */}
            <Card>
              <h2 className="font-bold text-[15px] mb-4">{t.common.overview}</h2>
              <div className="space-y-3">
                {[
                  { label: t.common.totalSessions, value: totalSessions, color: "rgba(255,255,255,0.88)" },
                  { label: t.common.pendingPayments, value: pendingPayments, color: "#FCD34D" },
                  { label: t.common.categories, value: categories.length, color: "rgba(255,255,255,0.88)" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1">
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.42)" }}>{row.label}</span>
                    <span className="text-sm font-black" style={{ color: row.color }}>{row.value}</span>
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
