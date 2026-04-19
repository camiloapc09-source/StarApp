import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Calendar, CreditCard, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import PaymentSubmitForm from "@/components/parent/payment-submit-form";
import { UpcomingSessionsCard } from "@/components/shared/upcoming-sessions-card";

export default async function ParentDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

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
                    date: {
                      gte: startOfMonth(new Date()),
                      lte: endOfMonth(new Date()),
                    },
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
                    {
                      status: "PENDING",
                      dueDate: { lte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
                    },
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
        <div className="p-4 md:p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>
            Tu cuenta no está vinculada a ningún jugador. Contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  const { player } = parent.children[0];

  const totalSessions = await db.session.count({
    where: {
      date: {
        gte: startOfMonth(new Date()),
        lte: endOfMonth(new Date()),
      },
    },
  });

  const presentCount = player.attendances.filter((a) => a.status === "PRESENT").length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  return (
    <div>
      <Header
        title={`Hola, ${session.user.name?.split(" ")[0] ?? ""}`}
        subtitle={`Seguimiento de ${player.user.name}`}
        notificationCount={unreadNotifications}
      />
      <div className="p-4 md:p-8 space-y-6">

        {/* Child overview */}
        <div
          className="rounded-2xl border p-6 flex items-center gap-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
          <Avatar name={player.user.name} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{player.user.name}</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {player.category?.name ?? "Sin categoría"}
              {player.jerseyNumber ? ` · Camiseta #${player.jerseyNumber}` : ""}
            </p>
            <div className="mt-3">
              <Badge variant={player.status === "ACTIVE" ? "success" : "warning"}>
                {player.status === "ACTIVE" ? "Activo" : player.status === "PENDING" ? "Pendiente" : player.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Upcoming sessions */}
        <UpcomingSessionsCard categoryId={player.categoryId} />

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Attendance */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Asistencias este mes</h2>
              <Calendar size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black">{attendanceRate}%</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {presentCount} de {totalSessions} sesiones
              </span>
            </div>
            <div className="space-y-2">
              {player.attendances.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Sin sesiones registradas este mes.
                </p>
              ) : (
                player.attendances.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span style={{ color: "var(--text-secondary)" }}>{att.session.title}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(att.session.date), "d MMM", { locale: es })}
                      </span>
                    </div>
                    <Badge
                      variant={
                        att.status === "PRESENT" ? "success" :
                        att.status === "LATE" ? "warning" : "error"
                      }
                    >
                      {att.status === "PRESENT" ? "Presente" : att.status === "LATE" ? "Tarde" : "Ausente"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Pagos</h2>
              <CreditCard size={16} style={{ color: "var(--accent)" }} />
            </div>
            {player.payments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                Al día con los pagos
              </div>
            ) : (
              <div className="space-y-3">
                {player.payments.map((p) => {
                  const isOverdue   = p.status === "OVERDUE";
                  const isSubmitted = p.status === "SUBMITTED";
                  return (
                    <div
                      key={p.id}
                      className="space-y-2 pb-3 border-b last:border-0 last:pb-0"
                      style={{ borderColor: "var(--border-primary)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{p.concept}</p>
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
            <Link
              href="/dashboard/parent/payments"
              className="flex items-center gap-1.5 text-xs mt-4 font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--accent)" }}
            >
              Ver historial completo
            </Link>
          </Card>

        </div>
      </div>
    </div>
  );
}
