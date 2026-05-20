import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, CreditCard, FileText, Users } from "lucide-react";
import PaymentSubmitForm from "@/components/parent/payment-submit-form";
import Link from "next/link";

const statusMeta: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  COMPLETED: { label: "Pagado",       variant: "success" },
  PENDING:   { label: "Pendiente",    variant: "warning" },
  OVERDUE:   { label: "Vencido",      variant: "error"   },
  SUBMITTED: { label: "En revisión",  variant: "default" },
};

export default async function ParentPaymentsPage({
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
              user: { select: { name: true } },
              payments: {
                orderBy: { dueDate: "desc" },
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
        <Header title="Pagos" subtitle="Historial y registro de pagos" />
        <div className="p-4 md:p-8 text-center">
          <p style={{ color: "var(--text-muted)" }}>Tu cuenta no está vinculada a ningún jugador.</p>
        </div>
      </div>
    );
  }

  const allChildren = parent.children;
  const activeChild = allChildren.find((c) => c.player.id === selectedPlayerId) ?? allChildren[0];
  const { player } = activeChild;
  const payments = player.payments;

  const pending   = payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const submitted = payments.filter((p) => p.status === "SUBMITTED");
  const completed = payments.filter((p) => p.status === "COMPLETED");

  return (
    <div>
      <Header
        title="Pagos"
        subtitle={`Cuenta de ${player.user.name}`}
      />
      <div className="p-4 md:p-8 space-y-6 max-w-2xl">

        {/* Multi-child selector */}
        {allChildren.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allChildren.map((child) => {
              const isActive = child.player.id === player.id;
              return (
                <Link
                  key={child.player.id}
                  href={`/dashboard/parent/payments?playerId=${child.player.id}`}
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

        {/* Pending / Overdue — with submit form */}
        {pending.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={15} style={{ color: "var(--warning)" }} />
              Pagos pendientes
            </h3>
            <div className="space-y-4">
              {pending.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border p-4 space-y-3"
                  style={{
                    borderColor: payment.status === "OVERDUE" ? "rgba(255,71,87,0.3)" : "var(--border-primary)",
                    background: payment.status === "OVERDUE" ? "rgba(255,71,87,0.04)" : "var(--bg-elevated)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{payment.concept}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Vence: {format(new Date(payment.dueDate), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg">${payment.amount.toLocaleString("es-CO")}</p>
                      <Badge variant={statusMeta[payment.status]?.variant ?? "default"}>
                        {statusMeta[payment.status]?.label ?? payment.status}
                      </Badge>
                    </div>
                  </div>
                  <PaymentSubmitForm paymentId={payment.id} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submitted — waiting confirmation */}
        {submitted.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock size={15} style={{ color: "var(--text-muted)" }} />
              En revisión
            </h3>
            <div className="space-y-3">
              {submitted.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{payment.concept}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {payment.paymentMethod ?? "—"} · {format(new Date(payment.dueDate), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${payment.amount.toLocaleString("es-CO")}</p>
                    <Badge variant="default">En revisión</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Payment history */}
        {completed.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
              Historial de pagos
            </h3>
            <div className="space-y-3">
              {completed.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{payment.concept}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {payment.paidAt ? format(new Date(payment.paidAt), "d MMM yyyy", { locale: es }) : "—"}
                      {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">${payment.amount.toLocaleString("es-CO")}</p>
                      <Badge variant="success">Pagado</Badge>
                    </div>
                    <Link
                      href={`/dashboard/parent/payments/${payment.id}/receipt`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80"
                      style={{ background: "rgba(139,92,246,0.10)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.20)" }}
                    >
                      <FileText size={11} /> Recibo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {payments.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <CreditCard size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No hay pagos registrados todavía.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
