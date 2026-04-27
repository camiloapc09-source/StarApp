"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle, CheckSquare, Square, Banknote,
  Loader2, PhoneCall, X, Check,
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
}

export default function BulkMarkReceivedPanel({ payments }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState<string>("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = selected.size === payments.length && payments.length > 0;
  const total = payments.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.amount, 0);

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
      // Navigate to batch receipt
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
              Acción requerida — {payments.length} pago{payments.length !== 1 ? "s" : ""}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Select all toggle */}
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

            {/* Bulk confirm button — shown when ≥1 selected */}
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

        {/* Payment rows */}
        <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
          {payments.map((payment) => {
            const isSelected = selected.has(payment.id);
            const parentLink = payment.player.parentLinks?.[0]?.parent;
            const phone = parentLink?.phone || parentLink?.user?.phone || payment.player.user.phone;
            const digits = phone?.replace(/[^0-9]/g, "");
            const daysLeft = differenceInDays(new Date(payment.dueDate), new Date());
            const isLate = payment.status === "OVERDUE" || daysLeft < 0;
            const waMsg = encodeURIComponent(
              isLate
                ? `Hola ${parentLink?.user?.name || payment.player.user.name}, le informamos que el pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" está vencido desde el ${format(new Date(payment.dueDate), "dd/MM/yyyy")}. Por favor regularice su situación. Gracias.`
                : `Hola ${parentLink?.user?.name || payment.player.user.name}, le recordamos que el pago de $${payment.amount.toLocaleString("es-CO")} por "${payment.concept}" vence el ${format(new Date(payment.dueDate), "dd/MM/yyyy")}. No olvide realizarlo a tiempo.`
            );
            const waHref = digits ? `https://api.whatsapp.com/send?phone=57${digits.replace(/^57/, "")}&text=${waMsg}` : null;

            return (
              <div
                key={payment.id}
                className="p-5 space-y-3 transition-all cursor-pointer"
                style={{ background: isSelected ? "rgba(52,211,153,0.04)" : "transparent" }}
                onClick={() => toggle(payment.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggle(payment.id); }}>
                    {isSelected
                      ? <CheckSquare size={18} style={{ color: "#34D399" }} />
                      : <Square size={18} style={{ color: "rgba(255,255,255,0.25)" }} />}
                  </div>

                  <Avatar name={payment.player.user.name} src={payment.player.user.avatar} size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{payment.player.user.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payment.concept}</p>
                    {payment.lastPaid ? (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                        Último pago: {format(new Date(payment.lastPaid.paidAt ?? payment.lastPaid.dueDate), "dd MMM yyyy", { locale: es })} · ${payment.lastPaid.amount.toLocaleString("es-CO")}
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

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pl-[42px]"
                  onClick={(e) => e.stopPropagation()}>
                  <RecordPaymentModal
                    paymentId={payment.id}
                    playerName={payment.player.user.name}
                    concept={payment.concept}
                    fullAmount={payment.amount}
                  />
                  {waHref && (
                    <a href={waHref} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
                      <PhoneCall size={13} /> Cobrar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

            {/* Method selector */}
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
