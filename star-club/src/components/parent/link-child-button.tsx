"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Search, Loader2, Check, Clock } from "lucide-react";

interface Player {
  id: string;
  name: string;
  category: string | null;
  documentNumber: string | null;
}

interface PendingLink {
  id: string;
  playerId: string;
  playerName: string;
  category: string | null;
}

export default function LinkChildButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch pending links on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/parent/link-request")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPendingLinks(data);
      })
      .catch(() => {});
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/parent/players?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (Array.isArray(data)) setPlayers(data);
        else setPlayers([]);
      } catch {
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (open) search(query);
  }, [query, open, search]);

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setSelected(null);
    setSuccess(false);
    setError(null);
    setConfirming(false);
  }

  function handleClose() {
    setOpen(false);
    if (success) router.refresh();
  }

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/link-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selected.id }),
      });
      if (res.ok) {
        setSuccess(true);
        // Add to pending list optimistically
        setPendingLinks((prev) => [
          ...prev,
          { id: "optimistic", playerId: selected.id, playerName: selected.name, category: selected.category },
        ]);
      } else {
        const d = await res.json();
        setError(d.error ?? "Error al enviar la solicitud");
        setSelected(null);
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setSelected(null);
    } finally {
      setConfirming(false);
    }
  }

  const pendingPlayerIds = new Set(pendingLinks.map((l) => l.playerId));

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{
          background: "rgba(139,92,246,0.10)",
          color: "#A78BFA",
          borderColor: "rgba(139,92,246,0.25)",
        }}
      >
        <UserPlus size={15} />
        Vincular mi hijo/a
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(18,14,48,0.98)",
              border: "1px solid rgba(139,92,246,0.25)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Vincular jugador/a</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* Success state */}
            {success ? (
              <div className="py-4 text-center space-y-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "rgba(139,92,246,0.15)" }}
                >
                  <Check size={24} style={{ color: "#A78BFA" }} />
                </div>
                <p className="font-semibold">Solicitud enviada</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Karen revisará y aprobará el vínculo. Recibirás una notificación cuando sea procesada.
                </p>
                <button
                  onClick={handleClose}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  Cerrar
                </button>
              </div>
            ) : selected ? (
              /* Confirm step */
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Vas a solicitar vincularte como acudiente de:
                </p>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                >
                  <p className="font-semibold">{selected.name}</p>
                  {selected.category && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {selected.category}
                    </p>
                  )}
                </div>
                {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-1 justify-center disabled:opacity-50 transition-all hover:opacity-80"
                    style={{ background: "rgba(139,92,246,0.18)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.35)" }}
                  >
                    {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {confirming ? "Enviando..." : "Confirmar solicitud"}
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="px-3 py-2 rounded-xl text-sm border transition-all hover:opacity-70"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
                  >
                    Atrás
                  </button>
                </div>
              </div>
            ) : (
              /* Search step */
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Busca al jugador/a que quieres vincular como tu hijo/a. Solo aparecen jugadores sin acudiente activo.
                </p>

                {/* Search input */}
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
                >
                  <Search size={14} style={{ color: "var(--text-muted)" }} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre del jugador..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {loading && <Loader2 size={13} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
                </div>

                {/* Player list */}
                {players.length > 0 && (
                  <div className="space-y-1.5">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.category && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{p.category}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Seleccionar</span>
                      </button>
                    ))}
                  </div>
                )}

                {!loading && query.length > 0 && players.length === 0 && (
                  <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                    No se encontraron jugadores sin acudiente con ese nombre.
                  </p>
                )}

                {query.length === 0 && players.length === 0 && !loading && (
                  <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                    Escribe el nombre del jugador/a para buscar.
                  </p>
                )}

                {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

                {/* Pending requests */}
                {pendingLinks.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                      Solicitudes enviadas
                    </p>
                    <div className="space-y-1.5">
                      {pendingLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <div>
                            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                              {link.playerName}
                            </p>
                            {link.category && (
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{link.category}</p>
                            )}
                          </div>
                          <span
                            className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ background: "rgba(255,184,0,0.10)", color: "rgba(255,184,0,0.75)" }}
                          >
                            <Clock size={11} />
                            Pendiente de aprobación
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
