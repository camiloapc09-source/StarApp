"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, X } from "lucide-react";

interface Props {
  playerId: string;
  playerName: string;
}

export default function InviteParentButton({ playerId, playerName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "PARENT", payload: { playerId } }),
      });
      const data = await res.json();
      if (res.ok) {
        setUrl(`${window.location.origin}/register?code=${data.code}`);
        setOpen(true);
      } else {
        alert(data.error || "Error generando enlace");
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
        style={{
          background: "rgba(52,211,153,0.10)",
          border: "1px solid rgba(52,211,153,0.25)",
          color: "#34D399",
        }}
      >
        <UserPlus size={13} />
        {loading ? "Generando..." : "Invitar padre/tutor"}
      </button>

      {open && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>

            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                Invitación generada
              </p>
              <h3 className="font-black text-lg">Enlace para padre / tutor</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Comparte este enlace con el padre o tutor de{" "}
                <strong className="text-white">{playerName}</strong>. Al registrarse quedará
                vinculado automáticamente.
              </p>
            </div>

            <div
              className="rounded-xl px-3 py-3 text-xs font-mono break-all"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {url}
            </div>

            <button
              onClick={copy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
              style={{
                background: copied ? "rgba(52,211,153,0.15)" : "rgba(139,92,246,0.15)",
                border: `1px solid ${copied ? "rgba(52,211,153,0.30)" : "rgba(139,92,246,0.30)"}`,
                color: copied ? "#34D399" : "#A78BFA",
              }}
            >
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar enlace</>}
            </button>

            <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
              El enlace es de uso único. Si el padre ya tiene cuenta, contacta al admin.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
