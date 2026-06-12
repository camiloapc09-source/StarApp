"use client";

import { useState } from "react";
import { UserPlus, X, Check, Copy, Eye, EyeOff } from "lucide-react";

interface Props {
  playerId: string;
  playerName: string;
}

export default function CreateParentButton({ playerId, playerName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setEmail(""); setPhone("");
    setResult(null); setError(null); setShowPwd(false); setCopied(false);
  }

  async function submit() {
    if (!name.trim() || !email.trim()) return setError("Nombre y correo son obligatorios");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/players/create-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentName: name.trim(), parentEmail: email.trim().toLowerCase(), parentPhone: phone.trim() || undefined, playerIds: [playerId] }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ tempPassword: data.data.tempPassword, email: data.data.email });
      } else {
        setError(data.error ?? "Error al crear la cuenta");
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `Accede a la app con:\nCorreo: ${result.email}\nContraseña temporal: ${result.tempPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{
          background: "rgba(251,191,36,0.10)",
          border: "1px solid rgba(251,191,36,0.25)",
          color: "#FBBF24",
        }}
      >
        <UserPlus size={13} />
        Crear acudiente
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

            {!result ? (
              <>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                    Nuevo acudiente
                  </p>
                  <h3 className="font-black text-lg">Crear cuenta de acudiente</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Se vinculará a <strong className="text-white">{playerName}</strong>. Si el correo ya está en uso como email del jugador, se reasignará automáticamente.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: "var(--text-muted)" }}>
                      Nombre completo *
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nombre del padre / madre / tutor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: "var(--text-muted)" }}>
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: "var(--text-muted)" }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="3001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={submit}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.30)", color: "#FBBF24" }}
                >
                  {saving ? "Creando cuenta..." : "Crear cuenta de acudiente"}
                </button>
              </>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(52,211,153,0.15)" }}>
                    <Check size={22} style={{ color: "#34D399" }} />
                  </div>
                  <h3 className="font-black text-lg">Cuenta creada</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Comparte estas credenciales con el acudiente.
                  </p>
                </div>

                <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Correo</p>
                    <p className="text-sm font-semibold mt-0.5">{result.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Contraseña temporal</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-mono font-bold flex-1">{showPwd ? result.tempPassword : "••••••••••"}</p>
                      <button onClick={() => setShowPwd(!showPwd)} className="opacity-50 hover:opacity-100 transition-opacity">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  El acudiente puede cambiar su contraseña desde Configurar cuenta en su panel.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={copyCredentials}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: copied ? "rgba(52,211,153,0.15)" : "rgba(139,92,246,0.15)",
                      border: `1px solid ${copied ? "rgba(52,211,153,0.30)" : "rgba(139,92,246,0.30)"}`,
                      color: copied ? "#34D399" : "#A78BFA",
                    }}
                  >
                    {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar credenciales</>}
                  </button>
                  <button
                    onClick={() => { setOpen(false); window.location.reload(); }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.30)", color: "#34D399" }}
                  >
                    Listo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
