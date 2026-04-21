"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, X, Check, Loader2, AlertCircle } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  NEQUI:    "Nequi",
  CARD:     "Tarjeta",
  PSE:      "PSE",
};

interface Props {
  paymentId:   string;
  playerName:  string;
  concept:     string;
  fullAmount:  number;
}

export default function RecordPaymentModal({ paymentId, playerName, concept, fullAmount }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [method, setMethod]   = useState("CASH");
  const [amount, setAmount]   = useState(fullAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isPartial  = amount > 0 && amount < fullAmount;
  const remainder  = fullAmount - amount;

  function handleOpen() {
    setAmount(fullAmount);
    setMethod("CASH");
    setError(null);
    setOpen(true);
  }

  async function confirm() {
    if (amount <= 0 || amount > fullAmount) {
      setError("El monto debe estar entre $1 y $" + fullAmount.toLocaleString("es-CO"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          paymentMethod: method,
          paidAmount:    amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar");
      setOpen(false);
      // Navigate to receipt for the completed payment
      router.push(`/dashboard/admin/payments/batch-receipt?ids=${paymentId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(255,184,0,0.12)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.3)" }}
      >
        <Banknote size={13} /> Registrar pago
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Registrar pago</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{playerName}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{concept}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Monto recibido
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: "rgba(255,255,255,0.40)" }}>$</span>
                <input
                  type="number"
                  min={1}
                  max={fullAmount}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-4 py-3 rounded-xl text-base font-bold outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.90)" }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Total adeudado: <strong>${fullAmount.toLocaleString("es-CO")}</strong>
                </span>
                {amount !== fullAmount && (
                  <button
                    onClick={() => setAmount(fullAmount)}
                    className="text-xs font-semibold underline"
                    style={{ color: "var(--accent)" }}>
                    Poner total
                  </button>
                )}
              </div>

              {/* Partial payment notice */}
              {isPartial && (
                <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.20)" }}>
                  <AlertCircle size={14} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--warning)" }}>Abono parcial</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                      Quedará pendiente un saldo de <strong className="text-white">${remainder.toLocaleString("es-CO")}</strong> por cobrar.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Method */}
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

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={confirm} disabled={loading || amount <= 0}
                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.30)" }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Registrando…</>
                  : <><Check size={14} /> {isPartial ? "Registrar abono y recibo" : "Confirmar y ver recibo"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
