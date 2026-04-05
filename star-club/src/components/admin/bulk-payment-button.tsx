"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, X, Loader2, Info } from "lucide-react";

export default function BulkPaymentButton({ defaultAmount }: { defaultAmount?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; noAmount?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default: current month
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [fallbackAmount, setFallbackAmount] = useState(String(defaultAmount ?? ""));
  const [concept, setConcept] = useState("");

  async function generate() {
    if (!month) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Send the 1st of the selected month as the reference date (day is irrelevant — each player uses their paymentDay)
    const dueDate = `${month}-01`;

    const res = await fetch("/api/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dueDate,
        ...(fallbackAmount ? { amount: Number(fallbackAmount) } : {}),
        concept: concept.trim() || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al generar pagos");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{
          background: "rgba(0,255,135,0.08)",
          color: "var(--success)",
          borderColor: "rgba(0,255,135,0.25)",
        }}
      >
        <Banknote size={15} />
        Generar cobros del mes
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5 space-y-4 w-full max-w-xl"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={16} style={{ color: "var(--success)" }} />
          <h3 className="font-semibold text-sm">Generar cobros mensuales</h3>
        </div>
        <button
          onClick={() => { setOpen(false); setResult(null); setError(null); }}
          className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        >
          <X size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Info box */}
      <div className="flex gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "var(--text-secondary)" }}>
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#818cf8" }} />
        <span>Cada jugador usara su monto mensual asignado. Solo se crean pagos para jugadores sin pago en el mes seleccionado. Si un jugador no tiene monto asignado, se usara el monto de respaldo.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Mes a generar
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Monto respaldo (sin asignar)
          </label>
          <input
            type="number"
            value={fallbackAmount}
            onChange={(e) => setFallbackAmount(e.target.value)}
            placeholder="Opcional"
            min="0"
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Concepto (opcional)
          </label>
          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Mensualidad..."
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {result && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(0,255,135,0.08)", color: "var(--success)" }}
        >
          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{result.created} pago{result.created !== 1 ? "s" : ""} generado{result.created !== 1 ? "s" : ""}.</p>
            {result.skipped > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{result.skipped} omitido{result.skipped !== 1 ? "s" : ""} (ya tenian pago o sin monto asignado).</p>}
            {result.noAmount != null && result.noAmount > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--warning)" }}>{result.noAmount} jugador{result.noAmount !== 1 ? "es" : ""} sin monto asignado — editales su perfil para asignar un monto mensual.</p>}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>
      )}

      <button
        onClick={generate}
        disabled={loading || !month}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: "var(--success)", color: "#000" }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
        {loading ? "Generando..." : "Generar pagos"}
      </button>
    </div>
  );
}
