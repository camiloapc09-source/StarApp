import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, Eye, Banknote, MessageCircle, ImageOff, FileSpreadsheet, UserPlus } from "lucide-react";
import { getDictionary } from "@/lib/dict";
import Link from "next/link";
import { PaymentConfirmButton, PaymentRejectButton, PaymentDeleteButton } from "@/components/admin/payment-actions";
import BulkPaymentButton from "@/components/admin/bulk-payment-button";
import MarkOverdueButton from "@/components/admin/mark-overdue-button";
import ProofViewer from "@/components/admin/proof-viewer";
import BulkMarkReceivedPanel from "@/components/admin/bulk-mark-received-panel";
import CompletedPaymentsAccordion from "@/components/admin/completed-payments-accordion";
import { Suspense } from "react";
import PaymentSearch from "@/components/admin/payment-search";
import { syncOverdueStatuses } from "@/lib/payment-reminders";
import { monthRange, isWithin } from "@/lib/dates";
import { hasContact } from "@/lib/phone";
import { evaluateDiscount } from "@/lib/discount";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const { q } = (await searchParams) ?? {};
  const query = q?.toLowerCase().trim() ?? "";
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const clubId = (session.user as { clubId?: string }).clubId ?? "club-star";

  // Red de seguridad por si el cron diario no corrió: solo corrige estados.
  // Las notificaciones, el push y los correos los manda el cron — antes se
  // disparaban aquí, así que solo salían si el admin abría esta página.
  await syncOverdueStatuses(clubId);

  const club = await db.club.findUnique({
    where: { id: clubId },
    select: {
      name: true, country: true, billingCycleDay: true,
      earlyPaymentDays: true, earlyPaymentDiscount: true,
    },
  });

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

  const matchesQuery = (p: typeof payments[0]) =>
    !query ||
    p.player.user.name.toLowerCase().includes(query) ||
    p.concept.toLowerCase().includes(query);

  const submitted = payments.filter((p) => p.status === "SUBMITTED" && matchesQuery(p));
  const pending   = payments.filter((p) => p.status === "PENDING"   && matchesQuery(p));
  const overdue   = payments.filter((p) => p.status === "OVERDUE"   && matchesQuery(p));
  const completed = payments.filter((p) => p.status === "COMPLETED" && matchesQuery(p));

  // Last paid map: playerId -> most recent completed payment
  const lastPaidMap = new Map<string, typeof payments[0]>();
  for (const p of [...completed].sort(
    (a, b) => new Date(b.paidAt ?? b.dueDate).getTime() - new Date(a.paidAt ?? a.dueDate).getTime()
  )) {
    if (!lastPaidMap.has(p.playerId)) lastPaidMap.set(p.playerId, p);
  }

  // Detect duplicates: same player with 2+ active payments in the same calendar month
  const activePayments = [...submitted, ...pending, ...overdue];
  const dupMap = new Map<string, typeof payments>();
  for (const p of activePayments) {
    const d = new Date(p.dueDate);
    const key = `${p.playerId}-${d.getFullYear()}-${d.getMonth()}`;
    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key)!.push(p);
  }
  const duplicateGroups = [...dupMap.values()].filter((g) => g.length > 1);

  // Todos los pagos por cobrar (vencidos + pendientes), se agrupan por mes en el panel
  const toCollect = [...overdue, ...pending];

  // "Recaudado" sumaba TODOS los pagos confirmados desde que existe el club.
  // Ese número solo sube y no dice nada: no distingue un mes bueno de uno malo.
  // Ahora la tarjeta muestra el mes en curso, con el histórico como dato
  // secundario y la comparación contra el mes pasado, que es la señal útil.
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const collectedThisMonth = completed
    .filter((p) => isWithin(p.paidAt ?? p.dueDate, thisMonth))
    .reduce((s, p) => s + p.amount, 0);
  const collectedLastMonth = completed
    .filter((p) => isWithin(p.paidAt ?? p.dueDate, lastMonth))
    .reduce((s, p) => s + p.amount, 0);
  const collectedAllTime = completed.reduce((s, p) => s + p.amount, 0);

  // Variación mes contra mes. `null` cuando no hay base de comparación.
  const monthDelta = collectedLastMonth > 0
    ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100)
    : null;

  const stats = {
    collected:  collectedThisMonth,
    pendingAmt: [...pending, ...overdue].reduce((s, p) => s + p.amount, 0),
    overdueAmt: overdue.reduce((s, p) => s + p.amount, 0),
  };

  const clubName = club?.name ?? "el club";
  const clubCountry = club?.country ?? "CO";

  // Cuántos alumnos por cobrar no tienen a quién escribirle. Antes el botón de
  // WhatsApp simplemente desaparecía sin decir por qué.
  const missingContactCount = new Set(
    [...overdue, ...pending]
      .filter((p) => !hasContact(p.player, clubCountry))
      .map((p) => p.playerId),
  ).size;

  const epd = club?.earlyPaymentDays ?? 0;
  const epdiscount = club?.earlyPaymentDiscount ?? 0;

  // Cuántos cobros abiertos califican HOY para el descuento.
  //
  // El letrero anterior calculaba una única ventana global a partir del día de
  // facturación del club (`billingCycleDay`), pero cada deportista tiene su
  // propio día de pago según su fecha de ingreso: para un alumno que paga el 3,
  // una ventana basada en el día 15 no significaba nada. Ahora se evalúa cobro
  // por cobro, contra su propio vencimiento.
  const discountEligible = [...pending, ...overdue].filter(
    (p) => evaluateDiscount(p.dueDate, p.amount, { earlyPaymentDays: epd, earlyPaymentDiscount: epdiscount }).applies,
  );
  const discountSavings = discountEligible.length * epdiscount;

  const dict = await getDictionary();

  return (
    <div>
      <Header
        title={dict.common.payments}
        subtitle={dict.payments?.subtitle ?? "Gestionar todos los pagos"}
      />
      <div className="p-4 md:p-8 space-y-5">

        {/* Top bar with search + export */}
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <PaymentSearch defaultValue={q} />
          </Suspense>
          <Link
            href="/api/admin/payments/export"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.70)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <FileSpreadsheet size={14} />
            Exportar Excel
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Recaudado */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "rgba(14,14,44,0.70)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase capitalize" style={{ color: "rgba(255,255,255,0.32)" }}>
                Recaudado · {thisMonth.label.split(" ")[0]}
              </p>
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(0,255,135,0.10)" }}>
                <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
              </div>
            </div>
            <p className="text-xl font-black tracking-tight leading-none" style={{ color: "rgba(255,255,255,0.92)" }}>
              ${collectedThisMonth.toLocaleString("es-CO")}
            </p>
            {/* Comparación con el mes pasado — la señal que de verdad dice
                si el mes va bien. Un acumulado histórico solo sube. */}
            {monthDelta !== null && (
              <p className="text-[11px] leading-none flex items-center gap-1"
                style={{ color: monthDelta >= 0 ? "var(--success)" : "var(--error)" }}>
                {monthDelta >= 0 ? "▲" : "▼"} {Math.abs(monthDelta)}%
                <span style={{ color: "rgba(255,255,255,0.28)" }}>
                  vs ${collectedLastMonth.toLocaleString("es-CO")} en {lastMonth.label.split(" ")[0]}
                </span>
              </p>
            )}
            <p className="text-[10px] leading-none" style={{ color: "rgba(255,255,255,0.25)" }}>
              Histórico: ${collectedAllTime.toLocaleString("es-CO")}
            </p>
          </div>
          {/* Por verificar */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "rgba(14,14,44,0.70)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.32)" }}>Por verificar</p>
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.15)" }}>
                <Eye size={13} style={{ color: "#818cf8" }} />
              </div>
            </div>
            <p className="text-xl font-black tracking-tight leading-none" style={{ color: "#818cf8" }}>
              {submitted.length}
            </p>
          </div>
          {/* Pendiente */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "rgba(14,14,44,0.70)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.32)" }}>Pendiente</p>
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,184,0,0.10)" }}>
                <Clock size={13} style={{ color: "var(--warning)" }} />
              </div>
            </div>
            <p className="text-xl font-black tracking-tight leading-none" style={{ color: "var(--warning)" }}>
              ${stats.pendingAmt.toLocaleString("es-CO")}
            </p>
          </div>
          {/* Vencido */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "rgba(14,14,44,0.70)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.32)" }}>Vencido</p>
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,71,87,0.10)" }}>
                <AlertTriangle size={13} style={{ color: "var(--error)" }} />
              </div>
            </div>
            <p className="text-xl font-black tracking-tight leading-none" style={{ color: "var(--error)" }}>
              ${stats.overdueAmt.toLocaleString("es-CO")}
            </p>
          </div>
        </div>

        {/* Descuento por pronto pago — ahora cuenta cobros reales, no una
            ventana global de calendario. */}
        {epdiscount > 0 && epd > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={discountEligible.length > 0
              ? { background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: discountEligible.length > 0 ? "#34D399" : "rgba(255,255,255,0.20)" }}
            />
            {discountEligible.length > 0 ? (
              <span style={{ color: "#6EE7B7" }}>
                <span className="font-bold">
                  {discountEligible.length} cobro{discountEligible.length !== 1 ? "s" : ""} con descuento por pronto pago
                </span>
                {" · "}${epdiscount.toLocaleString("es-CO")} c/u · hasta ${discountSavings.toLocaleString("es-CO")} de ahorro para las familias
                {" · "}<span style={{ color: "rgba(255,255,255,0.45)" }}>se aplica al registrar el pago</span>
              </span>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.40)" }}>
                Descuento por pronto pago{" "}
                <span className="font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>
                  ${epdiscount.toLocaleString("es-CO")}
                </span>
                {" · "}se aplica cuando el pago se registra dentro de los{" "}
                <span className="font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>{epd} días</span>
                {" "}siguientes al vencimiento de cada cobro · ninguno califica hoy
              </span>
            )}
          </div>
        )}

        {/* Action tools */}
        <div className="flex flex-wrap items-center gap-3">
          <BulkPaymentButton />
          <MarkOverdueButton />
          <Link
            href="/dashboard/admin/payments/visitor"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.70)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <UserPlus size={14} />
            Pago visitante
          </Link>
        </div>

        {/* DUPLICADOS — alerta si hay pagos duplicados en el mismo mes */}
        {duplicateGroups.length > 0 && (
          <div
            className="rounded-xl px-5 py-4 space-y-2"
            style={{ background: "rgba(255,184,0,0.07)", border: "1px solid rgba(255,184,0,0.25)" }}
          >
            <p className="text-xs font-bold tracking-wide uppercase" style={{ color: "var(--warning)" }}>
              ⚠ Pagos duplicados detectados
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              Los siguientes jugadores tienen más de un cobro activo para el mismo mes. Esto puede ocurrir si un pago fue reportado (En revisión) y luego se generó otro. Revisa y elimina el sobrante.
            </p>
            <div className="space-y-1 pt-1">
              {duplicateGroups.map((group) => {
                const player = group[0].player.user.name;
                const d = new Date(group[0].dueDate);
                const monthLabel = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
                return (
                  <p key={`${group[0].playerId}-${d.getFullYear()}-${d.getMonth()}`} className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                    · {player} — {group.length} cobros para {monthLabel}{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      ({group.map((p) => p.status).join(", ")})
                    </span>
                  </p>
                );
              })}
            </div>
          </div>
        )}

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
                      <PaymentDeleteButton paymentId={payment.id} playerName={payment.player.user.name} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* POR COBRAR — agrupado por mes, bulk selectable */}
        {toCollect.length > 0 && (
          <BulkMarkReceivedPanel
            payments={toCollect.map((p) => {
              const lp = lastPaidMap.get(p.playerId);
              return {
                id: p.id,
                playerId: p.playerId,
                amount: p.amount,
                concept: p.concept,
                status: p.status,
                dueDate: p.dueDate,
                player: {
                  id: p.playerId,
                  // `Player.phone` es lo que escribe el admin en "Nuevo jugador".
                  // Faltaba aquí, y por eso a esos deportistas no les salía el
                  // botón de WhatsApp aunque tuvieran el número guardado.
                  phone: p.player.phone,
                  user: {
                    name: p.player.user.name,
                    avatar: p.player.user.avatar,
                    phone: p.player.user.phone,
                  },
                  parentLinks: p.player.parentLinks,
                },
                lastPaid: lp
                  ? { paidAt: lp.paidAt, dueDate: lp.dueDate, amount: lp.amount }
                  : null,
              };
            })}
            clubName={clubName}
            clubCountry={clubCountry}
            missingContactCount={missingContactCount}
            earlyPaymentDays={club?.earlyPaymentDays}
            earlyPaymentDiscount={club?.earlyPaymentDiscount}
          />
        )}

        {/* PAGADOS — agrupados por mes con acordeón */}
        {completed.length > 0 && (
          <CompletedPaymentsAccordion
            payments={completed.map((p) => ({
              id: p.id,
              amount: p.amount,
              concept: p.concept,
              paidAt: p.paidAt,
              dueDate: p.dueDate,
              paymentMethod: p.paymentMethod,
              player: { user: { name: p.player.user.name, avatar: p.player.user.avatar } },
            }))}
          />
        )}

        {toCollect.length === 0 && completed.length === 0 && submitted.length === 0 && (
          <Card className="py-16 text-center">
            {query ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Sin resultados para &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay pagos registrados.</p>
                <Link href="/dashboard/admin/payments/new" className="mt-4 inline-block text-xs px-4 py-2 rounded-xl font-semibold" style={{ background: "var(--accent)", color: "#000" }}>
                  + Agregar primer pago
                </Link>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

