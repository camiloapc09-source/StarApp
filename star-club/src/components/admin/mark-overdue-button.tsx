"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export default function MarkOverdueButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; message?: string } | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/payments/mark-overdue", { method: "POST" });
    const data = await res.json();
    setResult(data);
    if (res.ok) router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          background: "rgba(255,71,87,0.08)",
          color: "var(--error)",
          borderColor: "rgba(255,71,87,0.25)",
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
        {loading ? "Procesando..." : "Marcar vencidos"}
      </button>

      {result && (
        <span className="text-xs" style={{ color: result.updated > 0 ? "var(--warning)" : "var(--text-muted)" }}>
          {result.updated > 0
            ? `${result.updated} pago${result.updated !== 1 ? "s" : ""} marcado${result.updated !== 1 ? "s" : ""} como vencido${result.updated !== 1 ? "s" : ""}`
            : (result.message ?? "Sin cambios")}
        </span>
      )}
    </div>
  );
}
