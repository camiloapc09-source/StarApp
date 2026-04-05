"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";

const TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  PENDING:   [{ label: "Confirmar pedido", next: "CONFIRMED" }, { label: "Cancelar pedido", next: "CANCELLED" }],
  CONFIRMED: [{ label: "Marcar entregado", next: "DELIVERED" }, { label: "Cancelar pedido", next: "CANCELLED" }],
  DELIVERED: [],
  CANCELLED: [],
};

export default function UniformStatusButton({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router  = useRouter();
  const actions = TRANSITIONS[currentStatus] ?? [];
  const [loading, setLoading] = useState<string | null>(null);

  if (actions.length === 0) return null;

  async function update(next: string) {
    setLoading(next);
    await fetch(`/api/uniforms/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {actions.map((a) => (
        <button
          key={a.next}
          onClick={() => update(a.next)}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50 transition-all hover:opacity-80"
          style={{
            background: a.next === "CANCELLED"
              ? "rgba(255,71,87,0.08)"
              : "rgba(0,255,135,0.08)",
            color: a.next === "CANCELLED" ? "var(--error)" : "var(--success)",
            borderColor: a.next === "CANCELLED"
              ? "rgba(255,71,87,0.25)"
              : "rgba(0,255,135,0.25)",
          }}
        >
          {loading === a.next ? <Loader2 size={11} className="animate-spin" /> : null}
          {a.label}
        </button>
      ))}
    </div>
  );
}
