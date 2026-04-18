import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import getDictionary from "@/lib/dict";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Users, CreditCard, Trophy, TrendingUp, UserCheck, Zap } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const t = await getDictionary();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

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
    db.player.count({ where: { status: "ACTIVE" } }),
    db.player.count({ where: { status: "PENDING" } }),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.category.findMany({ include: { _count: { select: { players: true } } } }),
    db.player.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: true, category: true },
    }),
    db.payment.count({ where: { status: "OVERDUE" } }),
    db.session.count(),
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);


  return (
    <div>
      <Header title={t.common.adminDashboard ?? t.common.dashboard} subtitle={t.common?.adminSubtitle ?? ""} notificationCount={unreadNotifications} />

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t.common.activePlayers} value={totalPlayers} icon={<Users size={20} />} iconColor="text-accent" />
          <StatCard
            label={t.common.pendingPlayers}
            value={pendingPlayers}
            icon={<UserCheck size={20} />}
            iconColor="text-warning"
          />
          <StatCard
            label={t.common.paidThisMonth}
            value={completedPayments}
            icon={<CreditCard size={20} />}
            iconColor="text-info"
          />
          <StatCard
            label={t.common.overduePayments}
            value={overduePayments}
            icon={<TrendingUp size={20} />}
            iconColor="text-error"
          />
        </div>

        {/* Main content row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Players */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">{t.common.recentPlayers}</h2>
                <Link
                  href="/dashboard/admin/players"
                  className="text-sm text-accent hover:text-accent-dim transition-colors"
                >
                  {t.common.viewAll}
                </Link>
              </div>
              <div className="space-y-3">
                {recentPlayers.length === 0 ? (
                  <p className="text-center py-6" style={{ color: "var(--text-muted)" }}>
                    {t.common.noPlayersYet}
                  </p>
                ) : (
                  recentPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <Avatar name={player.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{player.user.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {player.category?.name || "Unassigned"} · #{player.jerseyNumber || "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-accent">
                          <Zap size={12} />
                          <span>{player.xp} XP</span>
                        </div>
                        <Badge
                          variant={
                            player.status === "ACTIVE"
                              ? "success"
                              : player.status === "PENDING"
                              ? "warning"
                              : "default"
                          }
                        >
                          {player.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Categories */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{t.common.categories}</h2>
                <Trophy size={18} className="text-accent" />
              </div>
              <div className="space-y-3">
                {categories.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {t.common.noCategories}
                  </p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <span className="text-sm">{cat.name}</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-elevated)]" style={{ color: "var(--text-muted)" }}>
                        {cat._count.players} players
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h2 className="font-semibold mb-4">{t.common.quickActions}</h2>
              <div className="space-y-2">
                {[
                  { label: t.common.addNewPlayer, href: "/dashboard/admin/players/new" },
                  { label: t.common.coaches ?? "Entrenadores", href: "/dashboard/admin/coaches" },
                    { label: t.common.createSession ?? "Create Session", href: "/dashboard/admin/attendance/new" },
                    { label: t.common.recordPayment ?? "Record Payment", href: "/dashboard/admin/payments/new" },
                    { label: t.common.viewReports ?? t.common.viewAll, href: "/dashboard/admin/reports" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="block px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </Card>

            {/* Stats summary */}
            <Card>
              <h2 className="font-semibold mb-4">{t.common.overview}</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>{t.common.totalSessions}</span>
                  <span className="font-medium">{totalSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>{t.common.pendingPayments}</span>
                  <span className="font-medium text-warning">{pendingPayments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>{t.common.categories}</span>
                  <span className="font-medium">{categories.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
