"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, X, Search, CheckCircle2, AlertTriangle, Unlink } from "lucide-react";

interface ParentOption {
  id: string;
  name: string;
  email: string;
  parentProfile: {
    id: string;
    children: { player: { user: { name: string } } }[];
  } | null;
}

interface Props {
  playerId: string;
  playerName: string;
}

export default function LinkExistingParentButton({ playerId, playerName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/parents?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setParents(data.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, open]);

  async function link(parentUserId: string) {
    setLinking(parentUserId);
    try {
      const res = await fetch("/api/admin/players/link-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, parentUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(parentUserId);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(data.error ?? "Error al vincular");
      }
    } finally {
      setLinking(null);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setQuery(""); setSuccess(null); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{
          background: "rgba(139,92,246,0.10)",
          border: "1px solid rgba(139,92,246,0.25)",
          color: "#A78BFA",
        }}
      >
        <Link2 size={13} />
        Vincular padre existente
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
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
                Vincular acudiente
              </p>
              <h3 className="font-black text-lg">Seleccionar padre existente</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Busca el padre/tutor que quieres vincular a <strong className="text-white">{playerName}</strong>.
              </p>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)" }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar por nombre..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loading && (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Buscando...</p>
              )}
              {!loading && parents.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                  No se encontraron padres. Prueba con otro nombre.
                </p>
              )}
              {parents.map((p) => {
                const emailBroken = !p.email.includes("@");
                const childNames = p.parentProfile?.children.map((c) => c.player.user.name) ?? [];
                const isLinked = success === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs truncate flex items-center gap-1" style={{ color: emailBroken ? "var(--error)" : "var(--text-muted)" }}>
                        {emailBroken && <AlertTriangle size={10} />}
                        {p.email}
                      </p>
                      {childNames.length > 0 && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                          Hijos: {childNames.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => link(p.id)}
                      disabled={linking === p.id || isLinked}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                      style={{
                        background: isLinked ? "rgba(52,211,153,0.15)" : "rgba(139,92,246,0.15)",
                        border: `1px solid ${isLinked ? "rgba(52,211,153,0.30)" : "rgba(139,92,246,0.30)"}`,
                        color: isLinked ? "#34D399" : "#A78BFA",
                      }}
                    >
                      {isLinked ? <><CheckCircle2 size={12} /> Vinculado</> : linking === p.id ? "..." : <><Link2 size={12} /> Vincular</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
