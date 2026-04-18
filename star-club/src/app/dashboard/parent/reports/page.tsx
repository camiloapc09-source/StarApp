import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CheckCircle2, Clock, AlertTriangle, CreditCard, Calendar, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { getDictionary } from "@/lib/dict";
import Link from "next/link";

export default async function ParentReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/");

  const dict = await getDictionary();

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          player: {
            include: {
              user: { select: { name: true, avatar: true } },
              category: { select: { name: true } },
              payments: {
                orderBy: { dueDate: "desc" },
                take: 24,
              },
              attendances: {
                include: { session: { select: { id: true, title: true, date: true, type: true } } },
                orderBy: { session: { date: "desc" } },
                take: 30,
              },
            },
          },
        },
      },
    },
  });

  if (!parent || parent.children.length === 0) {
    return (
      <div>
        <Header title="Reportes" />
        <div className="p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>
            {dict.parent?.notLinked ?? "Tu cuenta no está vinculada a ningún jugador todavía."}
          </p>
        </div>
      </div>
    );
  }

  const { player } = parent.children[0];

  // Payment stats
  const payments         = player.payments;
  const completedPayments = payments.filter((p) => p.status === "COMPLETED");
  const pendingPayments   = payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const totalPaid         = completedPayments.reduce((s, p) => s + p.amount, 0);
  const totalPending      = pendingPayments.reduce((s, p) => s + p.amount, 0);

  // Attendance stats
  const attendances   = player.attendances;
  const totalSess     = attendances.length;
  const presentCount  = attendances.filter((a) => a.status === "PRESENT").length;
  const attendanceRate = totalSess > 0 ? Math.round((presentCount / totalSess) * 100) : 0;

  // 4-month attendance trend
  const now = new Date();
  const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
    const ref   = subMonths(now, 3 - i);
    const start = startOfMonth(ref);
    const end   = endOfMonth(ref);
    const inMonth = attendances.filter((a) => {
      const d = new Date(a.session.date);
      return d >= start && d <= end;
    });
    const present = inMonth.filter((a) => a.status === "PRESENT").length;
    const total   = inMonth.length;
    return {
      label: format(ref, "MMM", { locale: es }),
      present,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  const statusMeta: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
    COMPLETED: { label: "Pagado",    variant: "success" },
    PENDING:   { label: "Pendiente", variant: "warning" },
    OVERDUE:   { label: "Vencido",   variant: "error"   },
    SUBMITTED: { label: "En revisión", variant: "default" },
  };

  const typeLabel: Record<string, string> = {
    TRAINING: "Entrenamiento",
    MATCH:    "Partido",
    EVENT:    "Evento",
  };

  return (
    <div>
      <Header
        title="Reportes"
        subtitle={`Historial de pagos y asistencia de ${player.user.name}`}
      />
      <div className="p-8 space-y-6">

        {/* Child header */}
        <Card className="flex items-center gap-4">
          <Avatar name={player.user.name} src={player.user.avatar} size="lg" />
          <div>
            <h2 className="font-bold text-lg">{player.user.name}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {player.category?.name ?? "Sin categoría"}
            </p>
          </div>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Pendiente",      value: `$${totalPending.toLocaleString("es-CO")}`, color: "var(--warning)"  },
            { label: "Asistencia",     value: `${attendanceRate}%`,                        color: "var(--accent)"   },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center">
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            </Card>
          ))}
        </div>

        {/* Attendance trend */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={16} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold">Asistencia mensual</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {monthlyTrend.map(({ label, rate, present, total }) => (
              <div key={label} className="text-center">
                <p
                  className="text-2xl font-bold"
                  style={{ color: rate >= 80 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--error)" }}
                >
                  {rate}%
                </p>
                <p className="text-xs font-medium capitalize mt-1">{label}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{present}/{total}</p>
                <div className="mt-2">
                  <ProgressBar value={rate} max={100} height="sm" animated={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Payment history */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-primary)" }}>
              <CreditCard size={15} style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold text-sm">Historial de pagos</h2>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto" style={{ borderColor: "var(--border-primary)" }}>
              {payments.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No hay pagos registrados.
                </p>
              ) : (
                payments.map((p) => {
                  const meta = statusMeta[p.status] ?? { label: p.status, variant: "default" as const };
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.concept}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          Vence: {format(new Date(p.dueDate), "dd MMM yyyy", { locale: es })}
                          {p.paidAt ? ` · Pagado: ${format(new Date(p.paidAt), "dd MMM", { locale: es })}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">${p.amount.toLocaleString("es-CO")}</p>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Attendance history */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-primary)" }}>
              <BarChart3 size={15} style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold text-sm">Historial de asistencia</h2>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto" style={{ borderColor: "var(--border-primary)" }}>
              {attendances.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No hay sesiones registradas.
                </p>
              ) : (
                attendances.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-shrink-0">
                      {att.status === "PRESENT" && <CheckCircle2 size={14} style={{ color: "var(--success)" }} />}
                      {att.status === "LATE"    && <Clock size={14} style={{ color: "var(--warning)" }} />}
                      {att.status === "ABSENT"  && <AlertTriangle size={14} style={{ color: "var(--error)" }} />}
                      {att.status === "EXCUSED" && <Clock size={14} style={{ color: "var(--info)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.session.title}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(att.session.date), "dd MMM yyyy", { locale: es })}
                        {" · "}{typeLabel[att.session.type] ?? att.session.type}
                      </p>
                    </div>
                    <Badge
                      variant={
                        att.status === "PRESENT" ? "success" :
                        att.status === "LATE"    ? "warning" :
                        att.status === "ABSENT"  ? "error"   : "default"
                      }
                    >
                      {att.status === "PRESENT" ? "Presente" :
                       att.status === "LATE"    ? "Tarde"    :
                       att.status === "ABSENT"  ? "Ausente"  : "Justificado"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Export link */}
        <div className="flex justify-end">
          <Link
            href="/api/reports/export?type=players"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            Descargar reporte CSV
          </Link>
        </div>
      </div>
    </div>
  );
}
