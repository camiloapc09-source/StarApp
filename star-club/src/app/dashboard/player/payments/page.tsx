import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Info } from "lucide-react";
import { CoachPlayerBanner } from "@/components/coach/coach-player-banner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  COMPLETED: { label: "Pagado",      variant: "success" },
  PENDING:   { label: "Pendiente",   variant: "warning" },
  OVERDUE:   { label: "Vencido",     variant: "error"   },
  SUBMITTED: { label: "En revisión", variant: "default" },
};

export default async function PlayerPaymentsPage() {
  const session = await auth();
  const isCoachPlayer = session?.user?.role === "COACH";
  if (!session?.user || (session.user.role !== "PLAYER" && !(isCoachPlayer && session.user.linkedPlayerId))) redirect("/");

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      payments: { orderBy: { dueDate: "desc" }, take: 36 },
    },
  });

  if (!player) redirect("/dashboard/player");

  const payments = player.payments;
  const pending  = payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const hasBeca = player.scholarshipPct != null || player.monthlyAmount === 0;

  return (
    <div>
      <Header title="Mis pagos" subtitle="Estado de cuenta y mensualidades" />
      {isCoachPlayer && <CoachPlayerBanner />}
      <div className="p-4 md:p-8 space-y-5">

        {/* Beca banner */}
        {hasBeca && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#A78BFA" }}
          >
            <Info size={16} />
            Tienes una beca del {player.scholarshipPct ?? 100}% — tus pagos están cubiertos por el club.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center py-4">
            <p className="text-2xl font-black" style={{ color: totalPending > 0 ? "var(--error)" : "var(--success)" }}>
              ${totalPending.toLocaleString("es-CO")}
            </p>
            <p className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Pendiente
            </p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-2xl font-black" style={{ color: "var(--success)" }}>
              {payments.filter((p) => p.status === "COMPLETED").length}
            </p>
            <p className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Pagados
            </p>
          </Card>
        </div>

        {/* Pending payments */}
        {pending.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-primary)" }}>
              <AlertTriangle size={15} style={{ color: "var(--error)" }} />
              <h2 className="font-semibold text-sm">Pagos pendientes</h2>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#F87171" }}>
                {pending.length}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {pending.map((p) => {
                const meta = STATUS_META[p.status] ?? { label: p.status, variant: "default" as const };
                const isOverdue = p.status === "OVERDUE";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isOverdue ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.10)" }}
                    >
                      {isOverdue
                        ? <AlertTriangle size={16} style={{ color: "#F87171" }} />
                        : <Clock size={16} style={{ color: "#FCD34D" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.concept}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Vence: {format(new Date(p.dueDate), "dd 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-sm font-bold">${p.amount.toLocaleString("es-CO")}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Habla con tu padre/madre o tutor para coordinar el pago con la administración.
              </p>
            </div>
          </Card>
        )}

        {/* Full history */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-primary)" }}>
            <CreditCard size={15} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold text-sm">Historial completo</h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: "var(--border-primary)" }}>
            {payments.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
                No hay pagos registrados aún.
              </p>
            ) : (
              payments.map((p) => {
                const meta = STATUS_META[p.status] ?? { label: p.status, variant: "default" as const };
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-shrink-0">
                      {p.status === "COMPLETED" && <CheckCircle2 size={14} style={{ color: "var(--success)" }} />}
                      {p.status === "PENDING"   && <Clock size={14} style={{ color: "var(--warning)" }} />}
                      {p.status === "OVERDUE"   && <AlertTriangle size={14} style={{ color: "var(--error)" }} />}
                      {p.status === "SUBMITTED" && <Clock size={14} style={{ color: "var(--info, #38bdf8)" }} />}
                    </div>
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
      </div>
    </div>
  );
}
