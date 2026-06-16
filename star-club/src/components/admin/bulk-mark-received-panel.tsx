"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle, CheckSquare, Square, MinusSquare, Banknote,
  Loader2, PhoneCall, X, Check, MessageCircleMore, ChevronLeft, ChevronRight,
  ChevronDown, ChevronRight as ChevronRightSm,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import RecordPaymentModal from "@/components/admin/record-payment-modal";

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  NEQUI:    "Nequi",
  CARD:     "Tarjeta",
  PSE:      "PSE",
};

interface Payment {
  id: string;
  playerId: string;
  amount: number;
  concept: string;
  status: string;
  dueDate: string | Date;
  player: {
    user: { name: string; avatar?: string | null; phone?: string | null };
    parentLinks?: Array<{
      parent: { phone?: string | null; relation?: string | null; user: { name: string; phone?: string | null } };
    }>;
  };
  lastPaid?: { paidAt?: string | Date | null; dueDate: string | Date; amount: number } | null;
}

interface Props {
  payments: Payment[];
  clubName?: string;
  billingCycleDay?: number;
  earlyPaymentDays?: number;
  earlyPaymentDiscount?: number;
}

function getColombiaGreeting() {
  const hour = parseInt(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }),
    10
  );
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getColombiaDay(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  ).getDate();
}

export default function BulkMarkReceivedPanel({
  payments,
  clubName = "el club",
  billingCycleDay = 0,
  earlyPaymentDays = 0,
  earlyPaymentDiscount = 0,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState<string>("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBulkWa, setShowBulkWa] = useState(false);
  const [bulkWaIdx, setBulkWaIdx] = useState(0);

  const allSelected = selected.size === payments.length && payments.length > 0;
  const total = payments.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.amount, 0);

  // ─── Agrupar pagos por jugador ────────────────────────────────
  const groupsMap = new Map<string, Payment[]>();
  for (const p of payments) {
    if (!groupsMap.has(p.playerId)) groupsMap.set(p.playerId, []);
    groupsMap.get(p.playerId)!.push(p);
  }
  // Orden: jugadores con la deuda más antigua (mayor vencimiento) primero
  const groups = [...groupsMap.entries()]
    .map(([playerId, items]) => {
      const sorted = [...items].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      const oldest = sorted[0];
      const daysLeft = differenceInDays(new Date(oldest.dueDate), new Date());
      const isLate = oldest.status === "OVERDUE" || daysLeft < 0;
      return {
        playerId,
        items: sorted,
        player: oldest.player,
        totalAmount: items.reduce((s, p) => s + p.amount, 0),
        oldestDue: oldest.dueDate,
        oldestDaysLeft: daysLeft,
        isLate,
        lastPaid: oldest.lastPaid,
      };
    })
    .sort((a, b) => new Date(a.oldestDue).getTime() - new Date(b.oldestDue).getTime());

  // ─── WhatsApp: un mensaje por jugador (resumiendo todos sus meses) ───
  const bulkWaContacts = groups
    .map((g) => {
      const parentLink = g.player.parentLinks?.[0]?.parent;
      const phone = parentLink?.phone || parentLink?.user?.phone || g.player.user.phone;
      const digits = phone?.replace(/[^0-9]/g, "");
      if (!digits) return null;
      const greeting = getColombiaGreeting();
      const contactName = parentLink?.user?.name || g.player.user.name;
      const conceptList = g.items
        .map((p) => `• ${p.concept} — $${p.amount.toLocaleString("es-CO")}`)
        .join("\n");
      const monthsWord = g.items.length === 1 ? "el siguiente pago" : `los siguientes ${g.items.length} pagos`;
      const msgText = `${greeting} 😊, nos comunicamos del *${clubName}* 🏆.\n\nEsperamos que ${contactName} se encuentre muy bien. Le recordamos ${monthsWord} pendiente${g.items.length !== 1 ? "s" : ""} del deportista *${g.player.user.name}*:\n\n${conceptList}\n\n*Total: $${g.totalAmount.toLocaleString("es-CO")}*\n\nLe pedimos amablemente ponerse al día para continuar disfrutando de los servicios del club. 🙏\n\n¡Muchas gracias! 💚`;
      const waHref = `https://api.whatsapp.com/send?phone=57${digits.replace(/^57/, "")}&text=${encodeURIComponent(msgText)}`;
      return {
        playerName: g.player.user.name,
        contactName,
        totalAmount: g.totalAmount,
        count: g.items.length,
        isLate: g.isLate,
        daysLeft: g.oldestDaysLeft,
        dueDate: g.oldestDue,
        waHref,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(payments.map((p) => p.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(items: Payment[]) {
    const ids = items.map((p) => p.id);
    const allInGroup = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allInGroup) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleExpand(playerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/bulk-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar");
      setShowModal(false);
      setSelected(new Set());
      router.push(`/dashboard/admin/payments/batch-receipt?ids=${data.ids.join(",")}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: "rgba(255,184,0,0.2)", background: "rgba(255,184,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--warning)" }}>
              Acción requerida — {groups.length} jugador{groups.length !== 1 ? "es" : ""} · {payments.length} pago{payments.length !== 1 ? "s" : ""}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setBulkWaIdx(0); setShowBulkWa(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366" }}
            >
              <MessageCircleMore size={13} /> Cobrar a todos por WhatsApp
            </button>

            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{
                background: allSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${allSelected ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.10)"}`,
                color: allSelected ? "#C4B5FD" : "rgba(255,255,255,0.50)",
              }}
            >
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>

            {selected.size > 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.30)", color: "#34D399" }}
              >
                <Banknote size={13} />
                Confirmar {selected.size} seleccionado{selected.size !== 1 ? "s" : ""} · ${total.toLocaleString("es-CO")}
              </button>
            )}
          </div>
        </div>

        {/* Player groups */}
        <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
          {groups.map((g) => {
            const groupIds = g.items.map((p) => p.id);
            const selectedInGroup = groupIds.filter((id) => selected.has(id)).length;
            const allInGroup = selectedInGroup === groupIds.length;
            const someInGroup = selectedInGroup > 0 && !allInGroup;
            const isOpen = expanded.has(g.playerId);
            const multi = g.items.length > 1;
            const parentLink = g.player.parentLinks?.[0]?.parent;

            return (
              <div key={g.playerId} style={{ background: selectedInGroup > 0 ? "rgba(52,211,153,0.04)" : "transparent" }}>
                {/* Group header row */}
                <div
                  className="p-5 flex items-center gap-3 cursor-pointer transition-all"
                  onClick={() => (multi ? toggleExpand(g.playerId) : toggleGroup(g.items))}
                >
                  {/* Group checkbox */}
                  <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleGroup(g.items); }}>
                    {allInGroup
                      ? <CheckSquare size={18} style={{ color: "#34D399" }} />
                      : someInGroup
                      ? <MinusSquare size={18} style={{ color: "#34D399" }} />
                      : <Square size={18} style={{ color: "rgba(255,255,255,0.25)" }} />}
                  </div>

                  <Avatar name={g.player.user.name} src={g.player.user.avatar} size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{g.player.user.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {multi
                        ? `${g.items.length} meses pendientes`
                        : g.items[0].concept}
                      {parentLink?.user?.name ? ` · ${parentLink.user.name}` : ""}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black">${g.totalAmount.toLocaleString("es-CO")}</p>
                    <p className="text-xs font-medium" style={{ color: g.isLate ? "var(--error)" : "var(--warning)" }}>
                      {g.isLate
                        ? `Vencido ${Math.abs(g.oldestDaysLeft)}d`
                        : `Vence ${format(new Date(g.oldestDue), "dd MMM", { locale: es })}`}
                    </p>
                  </div>

                  {multi && (
                    <div className="flex-shrink-0 ml-1" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRightSm size={18} />}
                    </div>
                  )}
                </div>

                {/* Detail: one row per month — shown when single payment OR group expanded */}
                {(!multi || isOpen) && (
                  <div className="pb-3" style={{ background: "rgba(0,0,0,0.12)" }}>
                    {g.items.map((payment) => {
                      const isSelected = selected.has(payment.id);
                      const daysLeft = differenceInDays(new Date(payment.dueDate), new Date());
                      const isLate = payment.status === "OVERDUE" || daysLeft < 0;
                      const phone = parentLink?.phone || parentLink?.user?.phone || g.player.user.phone;
                      const digits = phone?.replace(/[^0-9]/g, "");
                      const greeting = getColombiaGreeting();
                      const contactName = parentLink?.user?.name || g.player.user.name;
                      const waMsg = encodeURIComponent(
                        isLate
                          ? `${greeting} 😊, nos comunicamos del *${clubName}* 🏆.\n\nEsperamos que ${contactName} se encuentre muy bien. El pago de *$${payment.amount.toLocaleString("es-CO")}* del deportista *${g.player.user.name}* por concepto de *${payment.concept}* se encuentra *vencido* desde el ${format(new Date(payment.dueDate), "dd/MM/yyyy")} 📋.\n\nLe pedimos amablemente ponerse al día. 🙏\n\n¡Muchas gracias! 💚`
                          : `${greeting} 😊, nos comunicamos del *${clubName}* 🏆.\n\nLe recordamos que el pago de *$${payment.amount.toLocaleString("es-CO")}* del deportista *${g.player.user.name}* por concepto de *${payment.concept}* tiene fecha límite el *${format(new Date(payment.dueDate), "dd/MM/yyyy")}* 📋.\n\n¡Muchas gracias! 💚`
                      );
                      const waHref = digits ? `https://api.whatsapp.com/send?phone=57${digits.replace(/^57/, "")}&text=${waMsg}` : null;

                      return (
                        <div key={payment.id} className="px-5 py-3 mx-3 my-1 rounded-xl flex items-center gap-3 flex-wrap"
                          style={{ background: isSelected ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)" }}>
                          <div className="flex-shrink-0 cursor-pointer" onClick={() => toggle(payment.id)}>
                            {isSelected
                              ? <CheckSquare size={16} style={{ color: "#34D399" }} />
                              : <Square size={16} style={{ color: "rgba(255,255,255,0.25)" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{payment.concept}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: isLate ? "var(--error)" : "var(--warning)" }}>
                              {isLate ? `Vencido ${Math.abs(daysLeft)}d` : `Vence ${format(new Date(payment.dueDate), "dd MMM", { locale: es })}`}
                              {" · "}${payment.amount.toLocaleString("es-CO")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <RecordPaymentModal
                              paymentId={payment.id}
                              playerName={g.player.user.name}
                              concept={payment.concept}
                              fullAmount={payment.amount}
                            />
                            {waHref && (
                              <a href={waHref} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                                style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
                                <PhoneCall size={12} /> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk WhatsApp cobro modal — un contacto por jugador */}
      {showBulkWa && bulkWaContacts.length > 0 && (() => {
        const contact = bulkWaContacts[bulkWaIdx];
        const totalContacts = bulkWaContacts.length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(37,211,102,0.25)" }}>

              <div className="px-5 py-4 flex items-center justify-between border-b"
                style={{ borderColor: "rgba(37,211,102,0.15)", background: "rgba(37,211,102,0.05)" }}>
                <div className="flex items-center gap-2">
                  <MessageCircleMore size={16} style={{ color: "#25D366" }} />
                  <span className="font-semibold text-sm" style={{ color: "#25D366" }}>
                    Cobro masivo por WhatsApp
                  </span>
                </div>
                <button onClick={() => setShowBulkWa(false)} className="p-1 rounded-lg hover:opacity-70">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Contacto {bulkWaIdx + 1} de {totalContacts}
                  </span>
                  <span className="text-xs" style={{ color: contact.isLate ? "var(--error)" : "var(--warning)" }}>
                    {contact.isLate ? `Vencido ${Math.abs(contact.daysLeft)}d` : `Vence ${format(new Date(contact.dueDate), "dd MMM", { locale: es })}`}
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${((bulkWaIdx + 1) / totalContacts) * 100}%`, background: "#25D366" }} />
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={contact.playerName} size="md" />
                  <div>
                    <p className="font-semibold text-sm">{contact.playerName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Acudiente: {contact.contactName}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-lg font-black">${contact.totalAmount.toLocaleString("es-CO")}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {contact.count} pago{contact.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <a
                  href={contact.waHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (bulkWaIdx < totalContacts - 1) setTimeout(() => setBulkWaIdx((i) => i + 1), 600);
                    else setShowBulkWa(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.30)" }}
                >
                  <PhoneCall size={15} />
                  Abrir WhatsApp y cobrar
                </a>
              </div>

              <div className="px-5 pb-5 flex items-center gap-2">
                <button
                  onClick={() => setBulkWaIdx((i) => Math.max(0, i - 1))}
                  disabled={bulkWaIdx === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.60)" }}
                >
                  <ChevronLeft size={13} /> Anterior
                </button>
                <div className="flex-1 text-center">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {bulkWaIdx + 1} / {totalContacts} con teléfono
                    {groups.length - bulkWaContacts.length > 0 && (
                      <> · <span style={{ color: "var(--warning)" }}>{groups.length - bulkWaContacts.length} sin teléfono</span></>
                    )}
                  </span>
                </div>
                {bulkWaIdx < totalContacts - 1 ? (
                  <button
                    onClick={() => setBulkWaIdx((i) => i + 1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(37,211,102,0.10)", border: "1px solid rgba(37,211,102,0.20)", color: "#25D366" }}
                  >
                    Siguiente <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBulkWa(false)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34D399" }}
                  >
                    <Check size={13} /> Listo
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk confirm modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Confirmar pagos en efectivo</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {selected.size} pago{selected.size !== 1 ? "s" : ""} · ${total.toLocaleString("es-CO")}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); setError(null); }}
                className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Método de pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(METHOD_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setMethod(val)}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: method === val ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${method === val ? "rgba(52,211,153,0.30)" : "rgba(255,255,255,0.08)"}`,
                      color: method === val ? "#34D399" : "rgba(255,255,255,0.50)",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); setError(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={confirm} disabled={loading}
                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.30)" }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Confirmando…</>
                  : <><Check size={14} /> Confirmar y ver recibos</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
