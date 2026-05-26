"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PowerOff, Power } from "lucide-react";

export default function PlayerStatusToggle({
  playerId,
  playerName,
  currentStatus,
}: {
  playerId: string;
  playerName: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (currentStatus === "PENDING") return null;

  const isActive = currentStatus === "ACTIVE";
  const newStatus = isActive ? "INACTIVE" : "ACTIVE";
  const label = isActive ? "Desactivar" : "Reactivar";

  async function handleToggle() {
    const msg = isActive
      ? `¿Desactivar a ${playerName}? Dejará de generar pagos y quedará inactivo.`
      : `¿Reactivar a ${playerName}? Volverá a estar activo y recibirá pagos.`;
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
      else {
        const d = await res.json();
        alert(d.error ?? "Error al actualizar");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
      style={isActive
        ? { background: "rgba(255,71,87,0.08)", color: "#ff4757", borderColor: "rgba(255,71,87,0.22)" }
        : { background: "rgba(0,255,135,0.08)", color: "var(--success)", borderColor: "rgba(0,255,135,0.22)" }
      }
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : isActive ? <PowerOff size={12} /> : <Power size={12} />}
      {loading ? "..." : label}
    </button>
  );
}
