"use client";

import { useState } from "react";
import { KeyRound, Check, AlertTriangle } from "lucide-react";

interface Props {
  parentCount: number;
}

export default function BulkResetParentsButton({ parentCount }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function reset() {
    if (!confirm(`¿Resetear la contraseña de los ${parentCount} acudientes a 1234567890? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bulk-reset-parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "1234567890" }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setCount(data.data?.count ?? parentCount);
      } else {
        alert(data.error ?? "Error al resetear contraseñas");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
        style={{ background: "rgba(52,211,153,0.12)", color: "#34D399", border: "1px solid rgba(52,211,153,0.25)" }}
      >
        <Check size={13} />
        {count} claves reseteadas a 1234567890
      </span>
    );
  }

  return (
    <button
      onClick={reset}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:opacity-80"
      style={{
        background: "rgba(251,191,36,0.10)",
        border: "1px solid rgba(251,191,36,0.25)",
        color: "#FBBF24",
      }}
    >
      <KeyRound size={13} />
      {loading ? "Reseteando..." : `Resetear claves (${parentCount} acudientes)`}
    </button>
  );
}
