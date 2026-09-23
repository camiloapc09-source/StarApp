"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, X, Check, Loader2, AlertCircle, Receipt, Sparkles } from "lucide-react";
import { toDateOnlyString, clubToday, parseDateOnly } from "@/lib/dates";
import { evaluateDiscount } from "@/lib/discount";

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
  /** Vencimiento del cobro — define la ventana de pronto pago. */
  dueDate?:    string | Date;
  earlyPaymentDays?: number;
  earlyPaymentDiscount?: number;
}

export default function RecordPaymentModal({
  paymentId, playerName, concept, fullAmount,
  dueDate, earlyPaymentDays = 0, earlyPaymentDiscount = 0,
}: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [method, setMethod]   = useState("CASH");
  const [amount, setAmount]   = useState(fullAmount);
  const [paidOn, setPaidOn]   = useState(() => toDateOnlyString(clubToday()));
  const [useDiscount, setUseDiscount] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  /** Queda en pantalla tras registrar, para poder abrir el recibo si se quiere. */
  const [doneId, setDoneId]   = useState<string | null>(null);

  const today = toDateOnlyString(clubToday());

  // Descuento por pronto pago. El servidor lo recalcula por su cuenta: esto es
  // solo para que el admin vea qué va a pasar antes de confirmar.
  const discount = dueDate
    ? evaluateDiscount(
        dueDate, fullAmount,
        { earlyPaymentDays, earlyPaymentDiscount },
        parseDateOnly(paidOn),
      )
    : null;
  const discountActive = Boolean(discount?.applies && useDiscount);
  const discountValue  = discountActive ? discount!.amount : 0;
  /** Lo que el alumno debe pagar hoy, ya con descuento. */
  const dueNow = fullAmount - discountValue;

  const isPartial  = amount > 0 && amount < dueNow;
  const remainder  = dueNow - amount;

  function handleOpen() {
    setMethod("CASH");
    setPaidOn(today);
    setUseDiscount(true);
    setError(null);
    setDoneId(null);
    // El monto arranca con el descuento ya restado, que es lo que se va a cobrar.
    const d = dueDate
      ? evaluateDiscount(dueDate, fullAmount, { earlyPaymentDays, earlyPaymentDiscount })
      : null;
    setAmount(d?.applies ? d.finalAmount : fullAmount);
    setOpen(true);
  }

  /**
   * Cierra el modal y recién ahí refresca la lista.
   *
   * El refresco desmonta esta fila cuando el cobro ya quedó pagado, así que
   * solo puede ocurrir cuando el admin terminó de mirar la confirmación.
   */
  function close() {
    const needsRefresh = doneId !== null;
    setOpen(false);
    if (needsRefresh) router.refresh();
  }

  async function confirm() {
    if (amount <= 0 || amount > dueNow) {
      setError("El monto debe estar entre $1 y $" + dueNow.toLocaleString("es-CO"));
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
          // Permite registrar un pago recibido otro día — antes `paidAt`
          // siempre quedaba con la fecha en que el admin lo digitaba.
          paidOn,
          // Solo se PIDE el descuento; el monto lo calcula el servidor.
          applyDiscount: discountActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar");
      // Antes esto hacía `router.push()` al recibo, sacando al admin de la
      // lista en CADA cobro. Cobrando a 15 papás en el entrenamiento eran 15
      // idas y vueltas. Ahora se queda aquí y el recibo es opcional.
      //
      // OJO: NO se refresca aquí. `router.refresh()` vuelve a pedir la página
      // al servidor, el cobro ya está COMPLETADO y desaparece de "por cobrar",
      // así que la fila —y este modal, que vive dentro de ella— se desmontan
      // y la confirmación con "Ver recibo" se esfuma al instante.
      // El refresco se hace al cerrar (ver `close`).
      setDoneId(paymentId);
      setLoading(false);
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
                <h2 className="font-bold text-base">{doneId ? "Pago registrado ✓" : "Registrar pago"}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{playerName}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{concept}</p>
              </div>
              <button onClick={close} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {doneId ? (
              /* Confirmación: se queda en la lista. El recibo es una opción,
                 no un desvío obligatorio. */
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <Check size={18} style={{ color: "#34D399" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#34D399" }}>
                      ${amount.toLocaleString("es-CO")} registrados
                    </p>
                    {isPartial ? (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                        Queda un saldo de ${remainder.toLocaleString("es-CO")} por cobrar.
                      </p>
                    ) : discountValue > 0 ? (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                        Con ${discountValue.toLocaleString("es-CO")} de descuento por pronto pago. Cobro saldado.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={close}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.30)" }}>
                    Seguir cobrando
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/admin/payments/batch-receipt?ids=${doneId}`)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    <Receipt size={14} /> Ver recibo
                  </button>
                </div>
              </div>
            ) : (
            <>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Monto recibido
              </label>

              {/* Descuento por pronto pago. Antes el club podía configurarlo y
                  la app lo anunciaba en un letrero, pero NUNCA lo aplicaba: se
                  cobraba el monto completo. Ahora se aplica de verdad, se ve
                  aquí, y el admin puede quitarlo si el caso lo amerita. */}
              {discount?.applies && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !useDiscount;
                    setUseDiscount(next);
                    setAmount(next ? fullAmount - discount.amount : fullAmount);
                  }}
                  className="w-full flex items-center gap-2.5 mb-2.5 rounded-xl px-3 py-2.5 text-left transition-all"
                  style={discountActive
                    ? { background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.30)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}
                >
                  {discountActive
                    ? <Check size={15} style={{ color: "#34D399", flexShrink: 0 }} />
                    : <Sparkles size={15} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold"
                      style={{ color: discountActive ? "#34D399" : "rgba(255,255,255,0.55)" }}>
                      Pronto pago · −${discount.amount.toLocaleString("es-CO")}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {discountActive
                        ? `Aplicado — paga $${dueNow.toLocaleString("es-CO")} en vez de $${fullAmount.toLocaleString("es-CO")}`
                        : "Sin aplicar — toca para agregarlo"}
                    </p>
                  </div>
                </button>
              )}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: "rgba(255,255,255,0.40)" }}>$</span>
                <input
                  type="number"
                  min={1}
                  max={dueNow}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-4 py-3 rounded-xl text-base font-bold outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.90)" }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {discountActive ? "A pagar hoy" : "Total adeudado"}: <strong>${dueNow.toLocaleString("es-CO")}</strong>
                  {discountActive && (
                    <span className="ml-1.5 line-through" style={{ color: "rgba(255,255,255,0.22)" }}>
                      ${fullAmount.toLocaleString("es-CO")}
                    </span>
                  )}
                </span>
                {amount !== dueNow && (
                  <button
                    onClick={() => setAmount(dueNow)}
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

            {/* Fecha en que se recibió el dinero — no siempre es hoy.
                Antes `paidAt` se ponía siempre en el momento de digitarlo, así
                que un cobro del sábado registrado el lunes quedaba mal fechado
                en los reportes. */}
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Fecha de pago
              </label>
              <input
                type="date"
                value={paidOn}
                max={today}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.90)" }}
              />
              {paidOn !== today && (
                <p className="text-xs mt-1.5" style={{ color: "var(--warning)" }}>
                  Se registrará con fecha anterior a hoy.
                </p>
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
              <button onClick={close}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={confirm} disabled={loading || amount <= 0}
                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.30)" }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Registrando…</>
                  : <><Check size={14} /> {isPartial ? "Registrar abono" : "Confirmar pago"}</>}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
