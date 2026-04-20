"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const SPORT_EMOJI: Record<string, string> = {
  BASKETBALL: "🏀",
  VOLLEYBALL: "🏐",
  FOOTBALL: "⚽",
  BASEBALL: "⚾",
  TENNIS: "🎾",
  SWIMMING: "🏊",
};

interface Club {
  id: string;
  name: string;
  logo: string | null;
  sport: string;
  slug: string;
}

export function ClubLoginForm({ club }: { club: Club }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    window.location.replace("/");
  }

  const emoji = SPORT_EMOJI[club.sport] ?? "🏆";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: "#06060F" }}
    >
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(88,28,235,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 85% 80%, rgba(29,78,216,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* Back link */}
      <div className="w-full max-w-sm mb-6 relative z-10">
        <button
          onClick={() => { window.location.href = "/"; }}
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.28)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
        >
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
          Cambiar club
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Club identity */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-4"
          >
            {club.logo ? (
              <img
                src={club.logo}
                alt={club.name}
                className="w-20 h-20 rounded-[28px] object-cover"
                style={{
                  boxShadow: "0 8px 40px rgba(139,92,246,0.35), 0 2px 8px rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-[28px] flex items-center justify-center text-4xl"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  boxShadow: "0 8px 40px rgba(139,92,246,0.30)",
                }}
              >
                {emoji}
              </div>
            )}
          </motion.div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-1">{club.name}</h1>
          <p className="text-xs font-medium tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>
            {club.sport}
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(14,12,40,0.80)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.50)",
          }}
        >
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.30)" }}>
            Inicia sesión
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.50)"; e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo o documento"
                required
                autoComplete="username"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "rgba(255,255,255,0.88)", caretColor: "#8B5CF6" }}
              />
            </div>

            {/* Password */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.50)"; e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                autoComplete="current-password"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "rgba(255,255,255,0.88)", caretColor: "#8B5CF6" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex-shrink-0 transition-colors"
                style={{ color: "rgba(255,255,255,0.25)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-center px-2 py-2 rounded-xl"
                style={{ color: "#F87171", background: "rgba(239,68,68,0.10)" }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: loading
                  ? "rgba(139,92,246,0.4)"
                  : "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4338CA 100%)",
                color: "white",
                boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.35)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Entrar <ArrowRight size={15} /></>
              )}
            </motion.button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.28)" }}>
          ¿No tienes cuenta?{" "}
          <Link
            href={`/${club.slug}/register`}
            className="font-semibold transition-colors"
            style={{ color: "rgba(167,139,250,0.80)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A78BFA")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.80)")}
          >
            Regístrate
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
