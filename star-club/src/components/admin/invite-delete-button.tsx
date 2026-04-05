"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

export function InviteDeleteButton({ inviteId }: { inviteId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Eliminar este código de invitación?")) return;
    setLoading(true);
    await fetch(`/api/invites?id=${inviteId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
      style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)" }}
      title="Eliminar invite"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  );
}
