import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Calendar, CreditCard, CheckCircle2, AlertTriangle,
  TrendingUp, Clock, ArrowRight, Zap, Shield, Users,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import PaymentSubmitForm from "@/components/parent/payment-submit-form";
import { UpcomingSessionsCard } from "@/components/shared/upcoming-sessions-card";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default async function ParentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const { playerId: selectedPlayerId } = await searchParams;

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          player: {
            include: {
              user: true,
              category: true,
              attendances: {
                include: { session: true },
                where: {
                  session: {
                    date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
                  },
                },
                take: 8,
                orderBy: { createdAt: "desc" },
              },
              payments: {
                where: {
                  OR: [
                    { status: "SUBMITTED" },
                    { status: "OVERDUE" },
                    { status: "PENDING", dueDate: { lte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) } },
                  ],
                },
                take: 5,
                orderBy: { dueDate: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const unreadNotifications = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  if (!parent || parent.children.length === 0) {
    return (
      <div>
        <Header title="Inicio" notificationCount={unreadNotifications} />
        <div className="p-4 md:p-8 text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <Shield size={28} style={{ color: "#A78BFA" }} />
          </div>
          <p className="font-semibold mb-2">Sin jugador vinculado</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tu cuenta no está vinculada a ningún jugador. Contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  // Pick selected child or default to first
  const allChildren = parent.children;
  const activeChild = allChildren.find((c) => c.player.id === selectedPlayerId) ?? allChildren[0];
  const { player } = activeChild;
  const firstName = session.user.name?.split(" ")[0] ?? "";

  const totalSessions = await db.session.count({
    where: {
      ...(player.categoryId ? { categoryId: player.categoryId } : {}),
      date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
    },
  });

  const presentCount    = player.attendances.filter((a) => a.status === "PRESENT").length;
  const attendanceRate  = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
  const overduePayments = player.payments.filter((p) => p.status === "OVERDUE");
  const hasOverdue      = overduePayments.length > 0;

  const quickActions = [
    { label: "Pagos",      href: "/dashboard/parent/payments",  color: "#60A5FA", bg: "rgba(96,165,250,0.15)"  },
    { label: "Uniformes",  href: "/dashboard/parent/uniforms",  color: "#FB923C", bg: "rgba(251,146,60,0.15)"  },
    { label: "Reportes",   href: "/dashboard/parent/reports",   color: "#34D399", bg: "rgba(52,211,153,0.15)"  },
    { label: "Perfil",     href: "/dashboard/parent/profile",   color: "#F472B6", bg: "rgba(244,114,182,0.15)" },
  ];

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
          <h2 className="text-2xl font-black tracking-tight text-white relative">{firstName} 👋</h2>
          <p className="text-sm mt-1 relative" style={{ color: "rgba(255,255,255,0.45)" }}>
            {hasOverdue
              ? `${player.user.name} tiene ${overduePayments.length} pago${overduePayments.length !== 1 ? "s" : ""} vencido${overduePayments.length !== 1 ? "s" : ""} — revísalos hoy.`
              : `Todo al día · Asistencia de ${player.user.name}: ${attendanceRate}% este mes.`}
          </p>
        </div>

        {/* Multi-child selector — only shown if parent has more than 1 child */}
        {allChildren.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allChildren.map((child) => {
              const isActive = child.player.id === player.id;
              return (
                <Link
                  key={child.player.id}
                  href={`/dashboard/parent?playerId=${child.player.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(139,92,246,0.40)" : "rgba(255,255,255,0.07)"}`,
                    color: isActive ? "#C4B5FD" : "rgba(255,255,255,0.50)",
                  }}
                >
                  <Users size={13} />
                  {child.player.user.name.split(" ")[0]}
                </Link>
              );
            })}
          </div>
        )}

        {/* Alert for overdue */}
        {hasOverdue && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.15)" }}>
              <AlertTriangle size={18} style={{ color: "#F87171" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "#F87171" }}>
                {overduePayments.length} pago{overduePayments.length !== 1 ? "s" : ""} vencido{overduePayments.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(248,113,113,0.65)" }}>
                Total: ${overduePayments.reduce((s, p) => s + p.amount, 0).toLocaleString("es-CO")}
              </p>
            </div>
            <Link href="/dashboard/parent/payments" className="text-xs font-bold flex items-center gap-1 flex-shrink-0" style={{ color: "#F87171" }}>
              Ver <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Player card */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "rgba(14,14,44,0.75)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
          <Avatar name={player.user.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-[17px] truncate">{player.user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
              {player.category?.name ?? "Sin categoría"}
              {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={player.status === "ACTIVE" ? "success" : "warning"}>
                {player.status === "ACTIVE" ? "Activo" : "Pendiente"}
              </Badge>
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#A78BFA" }}>
                <Zap size={10} />{player.xp} XP
              </span>
            </div>
          </div>
          {/* Attendance ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={attendanceRate >= 80 ? "#34D399" : attendanceRate >= 60 ? "#FCD34D" : "#F87171"}
                  strokeWidth="5"
                  strokeDasharray={`${(attendanceRate / 100) * 138.2} 138.2`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black">
                {attendanceRate}%
              </span>
            </div>
            <span className="text-[9px] font-bold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
              Asistencia
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl text-center transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
                {a.label === "Pagos"     && <CreditCard size={16} style={{ color: a.color }} strokeWidth={1.8} />}
                {a.label === "Uniformes" && <Shield size={16} style={{ color: a.color }} strokeWidth={1.8} />}
                {a.label === "Reportes"  && <TrendingUp size={16} style={{ color: a.color }} strokeWidth={1.8} />}
                {a.label === "Perfil"    && <Clock size={16} style={{ color: a.color }} strokeWidth={1.8} />}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Upcoming sessions */}
        <UpcomingSessionsCard categoryId={player.categoryId} />

        {/* Attendance & Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[14px]">Asistencia este mes</h2>
              <Calendar size={15} style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-black">{attendanceRate}%</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {presentCount} de {totalSessions} sesiones
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden mb-4" style={{ height: 5, background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${attendanceRate}%`,
                  background: attendanceRate >= 80 ? "var(--success)" : attendanceRate >= 60 ? "var(--warning)" : "var(--error)",
                }} />
            </div>
            <div className="space-y-2">
              {player.attendances.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin sesiones registradas este mes.</p>
              ) : (
                player.attendances.slice(0, 4).map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background: att.status === "PRESENT" ? "var(--success)"
                            : att.status === "LATE" ? "var(--warning)" : "var(--error)",
                        }} />
                      <span className="truncate" style={{ color: "var(--text-secondary)" }}>{att.session.title}</span>
                    </div>
                    <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(att.session.date), "d MMM", { locale: es })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[14px]">Pagos</h2>
              <CreditCard size={15} style={{ color: "var(--accent)" }} />
            </div>
            {player.payments.length === 0 ? (
              <div className="flex items-center gap-2.5 py-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,255,135,0.10)" }}>
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Al día</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin pagos pendientes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {player.payments.map((p) => {
                  const isOverdue   = p.status === "OVERDUE";
                  const isSubmitted = p.status === "SUBMITTED";
                  return (
                    <div key={p.id} className="space-y-2 pb-3 border-b last:border-0 last:pb-0"
                      style={{ borderColor: "var(--border-primary)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.concept}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Vence {format(new Date(p.dueDate), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: isOverdue ? "var(--error)" : "var(--text-primary)" }}>
                            ${p.amount.toLocaleString("es-CO")}
                          </p>
                          <Badge variant={isOverdue ? "error" : isSubmitted ? "default" : "warning"}>
                            {isOverdue ? "Vencido" : isSubmitted ? "En revisión" : "Pendiente"}
                          </Badge>
                        </div>
                      </div>
                      {!isSubmitted && <PaymentSubmitForm paymentId={p.id} />}
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/dashboard/parent/payments"
              className="flex items-center gap-1 text-xs mt-4 font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "var(--accent)" }}>
              Ver historial <ArrowRight size={11} />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
