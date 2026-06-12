"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  linkId: string;
  parentName: string;
  onDone: () => void;
}

export default function ApproveLinkRequestButton({ linkId, parentName, onDone }: Props) {
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "APPROVE" | "REJECT") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/link-requests/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onDone();
      } else {
        const d = await res.json();
        setError(d.error ?? "Error al procesar la solicitud");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && (
        <span className="text-xs" style={{ color: "var(--error)" }}>
          {error}
        </span>
      )}
      <button
        onClick={() => handleAction("APPROVE")}
        disabled={loading !== null}
        title={`Aprobar solicitud de ${parentName}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          background: "rgba(52,211,153,0.15)",
          color: "#34D399",
          borderColor: "rgba(52,211,153,0.30)",
        }}
      >
        {loading === "APPROVE" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Check size={12} />
        )}
        Aprobar
      </button>
      <button
        onClick={() => handleAction("REJECT")}
        disabled={loading !== null}
        title={`Rechazar solicitud de ${parentName}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          background: "rgba(239,68,68,0.10)",
          color: "#F87171",
          borderColor: "rgba(239,68,68,0.25)",
        }}
      >
        {loading === "REJECT" ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <X size={12} />
        )}
        Rechazar
      </button>
    </div>
  );
}
