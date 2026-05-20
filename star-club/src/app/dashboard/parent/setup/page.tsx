"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight,
  CheckCircle2, Users, Search, Check,
} from "lucide-react";

type Player = { id: string; name: string; category: string | null; linked: boolean };

export default function ParentSetupPage() {
  // Credentials
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [clubSlug, setClubSlug] = useState("");

  // Children
  const [players, setPlayers]         = useState<Player[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  // Load players + current user info from API (authoritative source, avoids SessionProvider issues)
  useEffect(() => {
    fetch("/api/parent/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.players) {
          setPlayers(data.players);
          setSelected(new Set(data.players.filter((p: Player) => p.linked).map((p: Player) => p.id)));
        }
        if (data.clubSlug) setClubSlug(data.clubSlug);
        // Pre-fill email only if it's a real address
        if (data.currentEmail && !data.currentEmail.endsWith(".internal")) {
          setEmail(data.currentEmail);
        }
      })
      .finally(() => setLoadingPlayers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlayer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6)  { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (selected.size === 0)  { setError("Selecciona al menos un jugador"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/parent/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, playerIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }

      setDone(true);
      await signIn("credentials", { email, password, clubSlug, redirect: false });
      setTimeout(() => { window.location.replace("/dashboard/parent"); }, 1400);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#06060F" }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.30)" }}>
            <CheckCircle2 size={32} style={{ color: "#34D399" }} />
          </div>
          <p className="text-xl font-black text-white">¡Listo!</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Tu cuenta está configurada. Entrando al panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: "#06060F" }}>
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 20% 0%, rgba(88,28,235,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 85% 80%, rgba(29,78,216,0.12) 0%, transparent 55%)
        `,
      }} />

      <div className="w-full max-w-lg relative">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center"
            style={{
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.30)",
              boxShadow: "0 8px 32px rgba(139,92,246,0.25)",
            }}>
            <ShieldCheck size={28} style={{ color: "#A78BFA" }} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-black tracking-tight text-white">Configura tu cuenta</h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            Elige tu correo, una contraseña y vincula a tus hijos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Credenciales ── */}
          <div className="rounded-3xl p-6 space-y-4"
            style={{
              background: "rgba(14,12,40,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
            }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
              Tu acceso
            </p>

            {/* Email */}
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
                Correo electrónico
              </label>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.10)" }}>
                <Mail size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "rgba(255,255,255,0.88)", caretColor: "#8B5CF6" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
                Nueva contraseña
              </label>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.10)" }}>
                <Lock size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "rgba(255,255,255,0.88)", caretColor: "#8B5CF6" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ color: "rgba(255,255,255,0.25)" }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
                Confirmar contraseña
              </label>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.10)" }}>
                <Lock size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  autoComplete="new-password"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "rgba(255,255,255,0.88)", caretColor: "#8B5CF6" }}
                />
              </div>
            </div>
          </div>

          {/* ── Hijos ── */}
          <div className="rounded-3xl p-6 space-y-4"
            style={{
              background: "rgba(14,12,40,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
            }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
                Tus hijos en el club
              </p>
              {selected.size > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(139,92,246,0.20)", color: "#A78BFA" }}>
                  {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Search size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o categoría…"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: "rgba(255,255,255,0.70)", caretColor: "#8B5CF6" }}
              />
            </div>

            {/* Player list */}
            {loadingPlayers ? (
              <div className="flex justify-center py-6">
                <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.30)" }}>
                {search ? "No hay coincidencias" : "No hay jugadores activos"}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {filtered.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-testid="player-item"
                      data-player-id={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                      style={{
                        background: isSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {/* Checkbox */}
                      <div className="w-4 h-4 rounded-md flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: isSelected ? "#7C3AED" : "rgba(255,255,255,0.08)",
                          border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.20)",
                        }}>
                        {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                        style={{ background: "rgba(139,92,246,0.20)", color: "#A78BFA" }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {p.name}
                        </p>
                        {p.category && (
                          <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {p.category}
                          </p>
                        )}
                      </div>
                      <Users size={12} style={{ color: isSelected ? "#A78BFA" : "rgba(255,255,255,0.20)", flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.20)" }}>
              ¿No encuentras a tu hijo? Contacta al administrador del club.
            </p>
          </div>

          {error && (
            <p className="text-xs text-center px-3 py-2.5 rounded-xl"
              style={{ color: "#F87171", background: "rgba(239,68,68,0.10)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-sm font-black tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: loading
                ? "rgba(139,92,246,0.4)"
                : "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4338CA 100%)",
              color: "white",
              boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.35)",
            }}
          >
            {loading
              ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <>Guardar y entrar <ArrowRight size={15} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
