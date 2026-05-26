"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

export function CreatePlayerProfileButton({ coachId, coachName }: { coachId: string; coachName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!confirm(`¿Crear perfil de jugador para ${coachName}? Quedará exento de mensualidades.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coaches/player-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "Error al crear perfil");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
      style={{
        background: "rgba(139,92,246,0.12)",
        color: "#DEC4FF",
        border: "1px solid rgba(139,92,246,0.25)",
      }}
      title="Crear perfil de jugador"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
      Crear perfil jugador
    </button>
  );
}

export function RemovePlayerProfileButton({ coachId, coachName }: { coachId: string; coachName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm(`¿Eliminar el perfil de jugador de ${coachName}? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coaches/player-profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "Error al eliminar perfil");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
      style={{
        background: "rgba(255,71,87,0.08)",
        color: "#ff4757",
        border: "1px solid rgba(255,71,87,0.18)",
      }}
      title="Eliminar perfil de jugador"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
      Quitar modo jugador
    </button>
  );
}
