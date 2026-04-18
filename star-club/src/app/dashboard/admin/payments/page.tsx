import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, Eye, Banknote, MessageCircle, ImageOff, PhoneCall, FileSpreadsheet } from "lucide-react";
import { getDictionary } from "@/lib/dict";
import Link from "next/link";
import { PaymentConfirmButton, PaymentCashButton, PaymentRejectButton } from "@/components/admin/payment-actions";
import BulkPaymentButton from "@/components/admin/bulk-payment-button";
import MarkOverdueButton from "@/components/admin/mark-overdue-button";
import ProofViewer from "@/components/admin/proof-viewer";

export default async function AdminPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  // Auto-mark overdue on every page visit so the admin always sees current state
  const now = new Date();
  const overdueToMark = await db.payment.findMany({
    where: { clubId, status: "PENDING", dueDate: { lt: now } },
    select: { id: true, playerId: true, concept: true, amount: true },
  });
  if (overdueToMark.length > 0) {
    await db.payment.updateMany({
      where: { id: { in: overdueToMark.map((p) => p.id) } },
      data: { status: "OVERDUE" },
    });
    // Notify players (fire-and-forget, don't block render)
    const playerIds = [...new Set(overdueToMark.map((p) => p.playerId))];
    const affectedPlayers = await db.player.findMany({
      where: { clubId, id: { in: playerIds } }, select: { id: true, userId: true },
    });
    const userIdMap = Object.fromEntries(affectedPlayers.map((p) => [p.id, p.userId]));
    for (const payment of overdueToMark) {
      const userId = userIdMap[payment.playerId];
      if (!userId) continue;
      const alreadyNotified = await db.notification.findFirst({
        where: { userId, type: "PAYMENT", message: { contains: payment.concept } },
      });
      if (!alreadyNotified) {
        await db.notification.create({
          data: {
            userId,
            title: "Pago vencido",
            message: `Tu pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" esta vencido.`,
            type: "PAYMENT",
          },
        });
      }
    }
  }

  const payments = await db.payment.findMany({
    where: { clubId },
    orderBy: { dueDate: "asc" },
    select: {
      id: true, playerId: true, amount: true, concept: true,
      status: true, dueDate: true, paidAt: true,
      paymentMethod: true, proofUrl: true, proofNote: true,
      player: {
        include: {
          user: { select: { name: true, avatar: true, phone: true } },
          parentLinks: {
            include: { parent: { select: { id: true, phone: true, relation: true, user: { select: { name: true, phone: true } } } } },
          },
        },
      },
    },
  });

  const submitted = payments.filter((p) => p.status === "SUBMITTED");
  const pending   = payments.filter((p) => p.status === "PENDING");
  const overdue   = payments.filter((p) => p.status === "OVERDUE");
  const completed = payments.filter((p) => p.status === "COMPLETED");

  // Last paid map: playerId -> most recent completed payment
  const lastPaidMap = new Map<string, typeof payments[0]>();
  for (const p of [...completed].sort(
    (a, b) => new Date(b.paidAt ?? b.dueDate).getTime() - new Date(a.paidAt ?? a.dueDate).getTime()
  )) {
    if (!lastPaidMap.has(p.playerId)) lastPaidMap.set(p.playerId, p);
  }

  // 10-day rule: split pending into action-required vs scheduled
  const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const actionItems = [...overdue, ...pending.filter((p) => new Date(p.dueDate) <= in10Days)];
  const scheduled   = pending.filter((p) => new Date(p.dueDate) > in10Days);

  const stats = {
    collected:  completed.reduce((s, p) => s + p.amount, 0),
    pendingAmt: [...pending, ...overdue].reduce((s, p) => s + p.amount, 0),
    overdueAmt: overdue.reduce((s, p) => s + p.amount, 0),
  };

  const dict = await getDictionary();

  return (
    <div>
      <Header
        title={dict.common.payments}
        subtitle={dict.payments?.subtitle ?? "Gestionar todos los pagos"}
      />
      <div className="p-8 space-y-6">

        {/* Top bar with export */}
        <div className="flex justify-end">
          <Link
            href="/api/admin/payments/export"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{
              background: "rgba(0,255,135,0.08)",
              color: "var(--success)",
              borderColor: "rgba(0,255,135,0.25)",
            }}
          >
            <FileSpreadsheet size={15} />
            Exportar Excel
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: "rgba(0,255,135,0.1)" }}>
              <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Recaudado</p>
              <p className="text-xl font-bold">${stats.collected.toLocaleString("es-CO")}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.15)" }}>
              <Eye size={20} style={{ color: "#818cf8" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Por verificar</p>
              <p className="text-xl font-bold" style={{ color: "#818cf8" }}>{submitted.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,184,0,0.1)" }}>
              <Clock size={20} style={{ color: "var(--warning)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pendiente</p>
              <p className="text-xl font-bold" style={{ color: "var(--warning)" }}>
                ${stats.pendingAmt.toLocaleString("es-CO")}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,71,87,0.1)" }}>
              <AlertTriangle size={20} style={{ color: "var(--error)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Vencido</p>
              <p className="text-xl font-bold" style={{ color: "var(--error)" }}>
                ${stats.overdueAmt.toLocaleString("es-CO")}
              </p>
            </div>
          </Card>
        </div>

        {/* Action tools */}
        <div className="flex flex-wrap items-center gap-3">
          <BulkPaymentButton />
          <MarkOverdueButton />
        </div>

        {/* POR VERIFICAR */}
        {submitted.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div
              className="px-6 py-4 border-b flex items-center gap-3"
              style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)" }}
            >
              <Eye size={16} style={{ color: "#818cf8" }} />
              <h2 className="font-semibold text-sm" style={{ color: "#818cf8" }}>
                Por verificar — {submitted.length} comprobante{submitted.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {submitted.map((payment) => {
                const parentLink = payment.player.parentLinks?.[0]?.parent;
                return (
                  <div key={payment.id} className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={payment.player.user.name} size="md" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{payment.player.user.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {payment.concept} · Vence {format(new Date(payment.dueDate), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">${payment.amount.toLocaleString("es-CO")}</p>
                        <span className="text-xs font-medium" style={{ color: "var(--warning)" }}>
                          {payment.paymentMethod === "CASH" ? "Efectivo" : payment.paymentMethod === "TRANSFER" ? "Transferencia" : "Otro"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 flex gap-4" style={{ background: "var(--bg-elevated)" }}>
                      {payment.proofUrl ? (
                        <ProofViewer src={payment.proofUrl} />
                      ) : payment.paymentMethod === "TRANSFER" ? (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg border flex flex-col items-center justify-center gap-1" style={{ borderColor: "var(--border-primary)" }}>
                          <ImageOff size={16} style={{ color: "var(--text-muted)" }} />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sin imagen</span>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1" style={{ background: "rgba(255,184,0,0.08)" }}>
                          <Banknote size={18} style={{ color: "var(--warning)" }} />
                          <span className="text-[10px] text-center px-1" style={{ color: "var(--warning)" }}>Efectivo</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {payment.proofNote ? (
                          <div className="flex gap-2">
                            <MessageCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                              &ldquo;{payment.proofNote}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>Sin nota del acudiente.</p>
                        )}
                        {parentLink && (
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                            Acudiente: {parentLink.user.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PaymentConfirmButton paymentId={payment.id} />
                      <PaymentRejectButton paymentId={payment.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ACCION REQUERIDA */}
        {actionItems.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "rgba(255,184,0,0.2)", background: "rgba(255,184,0,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                <h2 className="font-semibold text-sm" style={{ color: "var(--warning)" }}>
                  Acción requerida — {actionItems.length} pago{actionItems.length !== 1 ? "s" : ""}
                </h2>
              </div>
              <Link
                href="/dashboard/admin/payments/new"
                className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                + Agregar pago
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {actionItems.map((payment) => {
                const parentLink = payment.player.parentLinks?.[0]?.parent;
                const phone = parentLink?.phone || parentLink?.user?.phone;
                const digits = phone?.replace?.(/[^0-9]/g, "");
                const daysLeft = differenceInDays(new Date(payment.dueDate), new Date());
                const isLate = payment.status === "OVERDUE" || daysLeft < 0;
                const lastPaid = lastPaidMap.get(payment.playerId);
                const waMsg = encodeURIComponent(
                  isLate
                    ? `Hola ${parentLink?.user?.name || payment.player.user.name}, le informamos que el pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" esta vencido desde el ${format(new Date(payment.dueDate), "dd/MM/yyyy")}. Por favor regularice su situacion. Gracias.`
                    : `Hola ${parentLink?.user?.name || payment.player.user.name}, le recordamos que el pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" vence el ${format(new Date(payment.dueDate), "dd/MM/yyyy")}. No olvide realizarlo a tiempo.`
                );
                const waHref = digits ? `https://wa.me/${digits}?text=${waMsg}` : null;
                return (
                  <div key={payment.id} className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={payment.player.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{payment.player.user.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payment.concept}</p>
                        {lastPaid ? (
                          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                            Ultimo pago: {format(new Date(lastPaid.paidAt ?? lastPaid.dueDate), "dd MMM yyyy", { locale: es })} · ${lastPaid.amount.toLocaleString("es-CO")}
                          </p>
                        ) : (
                          <p className="text-[11px] mt-1" style={{ color: "var(--warning)" }}>Sin pagos anteriores</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black">${payment.amount.toLocaleString("es-CO")}</p>
                        <p className="text-xs font-medium" style={{ color: isLate ? "var(--error)" : "var(--warning)" }}>
                          {isLate
                            ? `Vencido ${Math.abs(daysLeft)}d`
                            : `Vence ${format(new Date(payment.dueDate), "dd MMM", { locale: es })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <PaymentCashButton paymentId={payment.id} />
                      {waHref && (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}
                        >
                          <PhoneCall size={13} /> Cobrar por WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* PROGRAMADOS */}
        {scheduled.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border-primary)" }}>
              <Clock size={14} style={{ color: "var(--text-muted)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                Programados — {scheduled.length} pago{scheduled.length !== 1 ? "s" : ""} futuros
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {scheduled.map((payment) => {
                const parentLink = payment.player.parentLinks?.[0]?.parent;
                const phone = parentLink?.phone || parentLink?.user?.phone;
                const digits = phone?.replace?.(/[^0-9]/g, "");
                const daysLeft = differenceInDays(new Date(payment.dueDate), new Date());
                const waMsg = encodeURIComponent(
                  `Hola ${parentLink?.user?.name || payment.player.user.name}, le recordamos que el pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" vence el ${format(new Date(payment.dueDate), "dd/MM/yyyy")}. No olvide realizarlo a tiempo.`
                );
                const waHref = digits ? `https://wa.me/${digits}?text=${waMsg}` : null;
                return (
                  <div key={payment.id} className="flex items-center gap-4 px-5 py-3">
                    <Avatar name={payment.player.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{payment.player.user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payment.concept}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold">${payment.amount.toLocaleString("es-CO")}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(payment.dueDate), "dd MMM yyyy", { locale: es })} · en {daysLeft}d
                      </p>
                    </div>
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 flex-shrink-0"
                        style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.2)" }}
                      >
                        <PhoneCall size={12} /> Cobrar
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* PAGADOS */}
        {completed.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border-primary)" }}>
              <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
              <h2 className="text-sm font-semibold">Pagos confirmados - {completed.length}</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {[...completed]
                .sort((a, b) => new Date(b.paidAt ?? b.dueDate).getTime() - new Date(a.paidAt ?? a.dueDate).getTime())
                .map((payment) => (
                  <div key={payment.id} className="flex items-center gap-4 px-6 py-3">
                    <Avatar name={payment.player.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{payment.player.user.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payment.concept}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${payment.amount.toLocaleString("es-CO")}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {payment.paymentMethod === "CASH" ? "Efectivo " : payment.paymentMethod === "TRANSFER" ? "Transferencia " : payment.paymentMethod === "NEQUI" ? "Nequi " : ""}
                        {format(new Date(payment.paidAt ?? payment.dueDate), "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <Badge variant="success">Pagado</Badge>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {actionItems.length === 0 && scheduled.length === 0 && completed.length === 0 && submitted.length === 0 && (
          <Card className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay pagos registrados.</p>
            <Link href="/dashboard/admin/payments/new" className="mt-4 inline-block text-xs px-4 py-2 rounded-xl font-semibold" style={{ background: "var(--accent)", color: "#000" }}>
              + Agregar primer pago
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

