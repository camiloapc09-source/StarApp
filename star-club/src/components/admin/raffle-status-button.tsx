"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  OPEN:   { label: "Cerrar rifa",    next: "CLOSED" },
  CLOSED: { label: "Finalizar",      next: "FINISHED" },
};

export default function RaffleStatusButton({
  raffleId, currentStatus,
}: {
  raffleId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const action = NEXT_STATUS[currentStatus];

  if (!action) return null;

  async function handleClick() {
    if (!confirm(`¿${action.label}?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/rifas/${raffleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="py-2 px-3 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
      style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      {loading ? "..." : action.label}
    </button>
  );
}
