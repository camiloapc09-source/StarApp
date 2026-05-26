"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";

export function RequestPlayerProfileButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleRequest() {
    if (!confirm("¿Deseas enviar una solicitud al administrador para activar tu perfil de jugador?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coach/request-player-profile", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al enviar la solicitud");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
        ✓ Solicitud enviada — el admin la revisará pronto
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRequest}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          background: "rgba(139,92,246,0.15)",
          color: "#DEC4FF",
          border: "1px solid rgba(139,92,246,0.30)",
        }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
        Solicitar perfil de jugador
      </button>
      {error && <p className="text-xs" style={{ color: "#ff4757" }}>{error}</p>}
    </div>
  );
}
