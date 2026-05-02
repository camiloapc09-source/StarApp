"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, Loader2, X } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  role?: string; // "PLAYER" | "PARENT"
  hasDocument?: boolean;
}

export default function ResetPasswordButton({ userId, userName, role = "PLAYER", hasDocument = false }: Props) {
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState<"random" | "document" | null>(null);
  const [result, setResult]       = useState<{ tempPassword: string; loginEmail: string; resetToDocument?: boolean } | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState<"password" | "email" | null>(null);

  async function reset(resetToDocument: boolean) {
    setLoading(resetToDocument ? "document" : "random");
    setError(null);
    try {
      const res = await fetch("/api/admin/players/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resetToDocument }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al resetear");
      setResult({ tempPassword: data.tempPassword, loginEmail: data.loginEmail, resetToDocument: data.resetToDocument });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }

  function copy(text: string, field: "password" | "email") {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); setError(null); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.20)", color: "#FCD34D" }}
      >
        <KeyRound size={13} />
        Resetear contraseña
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Resetear contraseña</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {userName} · {role === "PARENT" ? "Acudiente" : "Deportista"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {!result ? (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  La contraseña actual quedará inactiva de inmediato. Elige cómo resetear:
                </p>

                {error && (
                  <p className="text-sm px-3 py-2 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)" }}>
                    {error}
                  </p>
                )}

                <div className="space-y-2">
                  {/* Option 1: reset to document number (only for players with document) */}
                  {role === "PLAYER" && hasDocument && (
                    <button
                      onClick={() => reset(true)}
                      disabled={loading !== null}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "rgba(52,211,153,0.12)", color: "#34D399", border: "1px solid rgba(52,211,153,0.25)" }}
                    >
                      {loading === "document"
                        ? <><Loader2 size={14} className="animate-spin" /> Reseteando…</>
                        : "Resetear al número de documento"}
                    </button>
                  )}

                  {/* Option 2: random temp password */}
                  <button
                    onClick={() => reset(false)}
                    disabled={loading !== null}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.25)" }}
                  >
                    {loading === "random"
                      ? <><Loader2 size={14} className="animate-spin" /> Reseteando…</>
                      : "Generar contraseña aleatoria"}
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-xs font-bold tracking-wider uppercase" style={{ color: "rgba(52,211,153,0.70)" }}>
                    Nueva contraseña temporal
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Email</p>
                        <p className="text-sm font-mono font-semibold mt-0.5">{result.loginEmail}</p>
                      </div>
                      <button onClick={() => copy(result.loginEmail, "email")}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                        style={{ color: copied === "email" ? "#34D399" : "rgba(255,255,255,0.35)" }}>
                        {copied === "email" ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Contraseña temporal</p>
                        <p className="text-xl font-mono font-black mt-0.5 tracking-widest" style={{ color: "#FCD34D" }}>
                          {result.tempPassword}
                        </p>
                      </div>
                      <button onClick={() => copy(result.tempPassword, "password")}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                        style={{ color: copied === "password" ? "#34D399" : "rgba(255,255,255,0.35)" }}>
                        {copied === "password" ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {result.resetToDocument
                      ? "La contraseña es su número de documento. Pídele que la cambie en su perfil."
                      : "Compártela por WhatsApp y pídele que la cambie en su perfil."}
                  </p>
                </div>

                <button onClick={() => setOpen(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  Listo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
