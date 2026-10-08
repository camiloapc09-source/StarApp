"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function RaffleDeleteButton({
  raffleId, title,
}: {
  raffleId: string;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`¿Borrar la rifa "${title}"? Se eliminan también sus números y comprobantes. No se puede deshacer.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "No se pudo borrar la rifa");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label="Borrar rifa"
      className="flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
      style={{ background: "rgba(239,68,68,0.10)", color: "var(--error, #F87171)", border: "1px solid rgba(239,68,68,0.25)" }}
    >
      <Trash2 size={12} /> {loading ? "..." : "Borrar"}
    </button>
  );
}
