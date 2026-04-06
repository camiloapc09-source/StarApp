"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, AlertTriangle } from "lucide-react";

type Props = { playerId: string; playerName: string };

export default function DeletePlayerButton({ playerId, playerName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el registro.");
      router.push("/dashboard/admin/players");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
        style={{ background: "rgba(255,71,87,0.10)", color: "var(--error)", border: "1px solid rgba(255,71,87,0.25)" }}
      >
        <Trash2 size={13} />
        Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.80)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid rgba(255,71,87,0.30)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: "var(--error)" }} />
                <h2 className="font-bold text-base">Eliminar registro</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              ¿Estás seguro? Se eliminará el registro completo de{" "}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{playerName}</span>{" "}
              incluyendo pagos, asistencias y misiones. Esta acción no se puede deshacer.
            </p>

            {error && (
              <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: "var(--error)", color: "#fff" }}
              >
                {loading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
