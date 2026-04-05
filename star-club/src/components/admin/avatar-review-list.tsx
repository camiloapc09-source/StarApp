"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PendingAvatar {
  userId: string;
  name: string;
  avatarPending: string;
}

export default function AvatarReviewList({ pending }: { pending: PendingAvatar[] }) {
  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        Fotos de perfil pendientes ({pending.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pending.map((u) => (
          <AvatarCard key={u.userId} user={u} />
        ))}
      </div>
    </div>
  );
}

function AvatarCard({ user }: { user: PendingAvatar }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  async function review(action: "approve" | "reject") {
    setLoading(action);
    await fetch("/api/admin/avatar-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: user.userId }),
    });
    setDone(true);
    router.refresh();
    setLoading(null);
  }

  if (done) return null;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
    >
      <Image
        src={user.avatarPending}
        alt={user.name}
        width={72}
        height={72}
        className="w-18 h-18 rounded-xl object-cover flex-shrink-0"
        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12 }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{user.name}</p>
        <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--text-muted)" }}>Foto de cédula con uniforme</p>
        <div className="flex gap-2">
          <button
            onClick={() => review("approve")}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: "rgba(0,255,135,0.12)", color: "var(--success)" }}
          >
            {loading === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Aprobar
          </button>
          <button
            onClick={() => review("reject")}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: "rgba(255,71,87,0.10)", color: "var(--error)" }}
          >
            {loading === "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
