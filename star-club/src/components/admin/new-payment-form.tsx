"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Banknote, Printer } from "lucide-react";

const CONCEPTS = ["Mensualidad", "Matricula", "Torneo", "Uniforme", "Seguro", "Otro"];

type Props = {
  players: { id: string; name: string; paymentDay: number | null }[];
  adminName?: string;
};

type ReceiptData = {
  receiptId: string;
  playerName: string;
  concept: string;
  amount: number;
  date: string;
};

function getPeriodLabel(dueDate: string): string {
  if (!dueDate) return "";
  const due = new Date(dueDate);
  const periodEnd = new Date(due.getFullYear(), due.getMonth() + 1, due.getDate() - 1);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const optsYear: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return due.toLocaleDateString("es-CO", opts) + " - " + periodEnd.toLocaleDateString("es-CO", optsYear);
}

export default function NewPaymentForm({ players, adminName }: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("Mensualidad");
  const [customConcept, setCustomConcept] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    return d.toISOString().slice(0, 10);
  });
  const [cashImmediate, setCashImmediate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId || concept !== "Mensualidad") return;
    const player = players.find((p) => p.id === playerId);
    if (!player?.paymentDay) return;
    const now = new Date();
    const day = player.paymentDay;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const proposed = new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay));
    if (proposed < now) {
      const nextLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
      proposed.setMonth(proposed.getMonth() + 1);
      proposed.setDate(Math.min(day, nextLastDay));
    }
    setDueDate(proposed.toISOString().slice(0, 10));
  }, [playerId, concept, players]);

  const periodLabel = concept === "Mensualidad" ? getPeriodLabel(dueDate) : "";
  const effectiveConcept =
    concept === "Mensualidad" && periodLabel
      ? "Mensualidad " + periodLabel
      : concept === "Otro"
      ? customConcept || "Otro"
      : concept;
  const selectedPlayerName = players.find((p) => p.id === playerId)?.name ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return setError("Selecciona un deportista.");
    if (!amount || parseFloat(amount) <= 0) return setError("Ingresa un monto valido.");
    setLoading(true);
    setError(null);

    const createRes = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        amount: parseFloat(amount),
        concept: effectiveConcept,
        dueDate: new Date(dueDate).toISOString(),
        status: "PENDING",
      }),
    });

    if (!createRes.ok) {
      const data = await createRes.json();
      setError(data.error ?? "Error al crear pago");
      setLoading(false);
      return;
    }

    const created = await createRes.json();

    if (cashImmediate) {
      await fetch("/api/payments/" + created.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
      setReceipt({
        receiptId: created.id.slice(-8).toUpperCase(),
        playerName: selectedPlayerName,
        concept: effectiveConcept,
        amount: parseFloat(amount),
        date: new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }),
      });
    } else {
      setTimeout(() => router.push("/dashboard/admin/payments"), 1200);
    }
    setLoading(false);
  }

  // Receipt view — bank-style confirmation screen
  if (receipt) {
    return (
      <div className="flex flex-col items-center gap-5">

        {/* Hero confirmation */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,255,135,0.12)", border: "2px solid var(--success)" }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Pago recibido</p>
            <p className="text-4xl font-black mt-1">${receipt.amount.toLocaleString("es-CO")}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>COP · Efectivo</p>
          </div>
        </div>

        {/* Receipt card — screenshot-friendly */}
        <div
          id="receipt-card"
          className="w-full rounded-2xl overflow-hidden border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
        >
          {/* Card header */}
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border-primary)", background: "rgba(0,255,135,0.04)" }}>
            <div>
              <p className="font-black text-base tracking-tight">STAR CLUB</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Comprobante de pago en efectivo</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(0,255,135,0.1)", color: "var(--success)" }}>
                #{receipt.receiptId}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-0 divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {[
              { label: "Fecha", value: receipt.date },
              { label: "Deportista", value: receipt.playerName },
              { label: "Concepto", value: receipt.concept },
              { label: "Método", value: "Efectivo" },
              { label: "Recibido por", value: adminName || "Administrador" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="text-sm font-medium text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>

          {/* Total highlight */}
          <div className="mx-5 mb-5 px-4 py-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(0,255,135,0.08)" }}>
            <span className="text-sm font-semibold">Total recibido</span>
            <span className="text-xl font-black" style={{ color: "var(--success)" }}>
              ${receipt.amount.toLocaleString("es-CO")} COP
            </span>
          </div>

          <p className="text-[10px] text-center pb-4 px-5" style={{ color: "var(--text-muted)" }}>
            Este comprobante certifica el pago recibido por Star Club · {receipt.date}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 border"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
          >
            <Printer size={15} /> Imprimir
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/payments")}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Volver a pagos
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,184,0,0.06)", borderLeft: "3px solid var(--warning)" }}>
        <Banknote size={16} style={{ color: "var(--warning)" }} />
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Este formulario es para registrar pagos manuales recibidos por el administrador, principalmente en efectivo.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>DEPORTISTA</label>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        >
          <option value="">Seleccionar deportista...</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.paymentDay ? " (dia " + p.paymentDay + ")" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>CONCEPTO</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {CONCEPTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConcept(c)}
              className="px-3 py-1 rounded-xl text-xs font-medium border transition-all"
              style={
                concept === c
                  ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                  : { background: "var(--bg-elevated)", color: "var(--text-secondary)", borderColor: "var(--border-primary)" }
              }
            >
              {c}
            </button>
          ))}
        </div>
        {concept === "Otro" && (
          <input
            value={customConcept}
            onChange={(e) => setCustomConcept(e.target.value)}
            placeholder="Especifica el concepto"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
          />
        )}
        {periodLabel && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--accent)" }}>
            Periodo: {periodLabel}
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>MONTO (COP)</label>
        <input
          type="number"
          min="0"
          step="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ej: 80000"
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>FECHA DE VENCIMIENTO / PAGO</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
        />
      </div>

      <label
        className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all"
        style={
          cashImmediate
            ? { borderColor: "var(--success)", background: "rgba(0,255,135,0.06)" }
            : { borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }
        }
      >
        <input
          type="checkbox"
          checked={cashImmediate}
          onChange={(e) => setCashImmediate(e.target.checked)}
          className="w-4 h-4 accent-[var(--accent)]"
        />
        <div>
          <p className="text-sm font-semibold">Efectivo recibido ahora</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            El pago se marcara como <strong>Pagado</strong> inmediatamente y se generara un recibo imprimible.
          </p>
        </div>
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/payments")}
          className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-70"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Registrando..." : cashImmediate ? "Registrar y generar recibo" : "Crear pendiente"}
        </button>
      </div>
    </form>
  );
}