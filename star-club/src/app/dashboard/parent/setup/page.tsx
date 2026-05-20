"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ParentSetupPage() {
  const { data: session } = useSession();
  const clubSlug = (session?.user as any)?.clubSlug ?? "";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6)  { setError("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/parent/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }

      setDone(true);
      // Re-login to refresh the session token with the new email
      await signIn("credentials", { email, password, clubSlug, redirect: false });
      setTimeout(() => { window.location.replace("/dashboard/parent"); }, 1200);
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

      <div className="w-full max-w-sm relative">
        {/* Icon */}
        <div className="flex justify-center mb-8">
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white">Configura tu cuenta</h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            Tu cuenta usa credenciales temporales. Elige tu correo real y
            una contraseña para continuar.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 space-y-4"
          style={{
            background: "rgba(14,12,40,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && (
              <p className="text-xs text-center px-3 py-2 rounded-xl"
                style={{ color: "#F87171", background: "rgba(239,68,68,0.10)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-black tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
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

          <p className="text-[11px] text-center pt-1" style={{ color: "rgba(255,255,255,0.20)" }}>
            Usa un correo al que tengas acceso. Lo necesitarás para entrar la próxima vez.
          </p>
        </div>
      </div>
    </div>
  );
}
