"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";

export default function DeleteSessionButton({ sessionId, sessionTitle }: { sessionId: string; sessionTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al eliminar");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-all hover:opacity-70"
        style={{ color: "var(--error)" }}
        title="Eliminar sesion"
      >
        <Trash2 size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "rgba(255,71,87,0.1)" }}>
                <AlertTriangle size={18} style={{ color: "var(--error)" }} />
              </div>
              <div>
                <h2 className="font-bold">Eliminar sesion</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Se eliminara <strong>{sessionTitle}</strong> y todos sus registros de asistencia. Esta accion no se puede deshacer.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
            {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: "var(--error)", color: "#fff" }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
