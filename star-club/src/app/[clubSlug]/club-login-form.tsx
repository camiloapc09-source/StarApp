"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { NovaIcon, NovaWordmark } from "@/components/nova-logo";

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

const PHI = 1.6180339887;
const STARS = Array.from({ length: 110 }, (_, i) => ({
  id: i,
  x: (i * PHI * 37.3) % 100,
  y: (i * PHI * PHI * 53.7) % 100,
  size: i % 5 === 0 ? 1.6 : i % 3 === 0 ? 1.0 : 0.6,
  opacity: 0.12 + (i % 8) * 0.07,
  duration: 2.5 + (i % 6),
  delay: (i % 5) * 0.7,
}));

function StarField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
          }}
          animate={{ opacity: [s.opacity, s.opacity * 0.1, s.opacity] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 10% 20%, rgba(76,29,149,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 88% 70%, rgba(29,78,216,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 45% 35% at 55% 90%, rgba(13,148,136,0.09) 0%, transparent 50%),
            radial-gradient(ellipse 30% 30% at 75% 15%, rgba(139,92,246,0.08) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Correo o contraseña inválidos. Inténtalo de nuevo.");
      return;
    }

    window.location.replace("/");
  }

  const emoji = SPORT_EMOJI[club.sport] ?? "🏆";

  return (
    <div
      className="h-screen flex relative overflow-hidden"
      style={{ background: "#030308" }}
    >
      <StarField />

      {/* ── LEFT — club branding (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center w-full max-w-xs"
        >
          {/* Club logo floating */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6"
          >
            {club.logo ? (
              <div
                className="w-32 h-32 rounded-full overflow-hidden mx-auto"
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 0 60px rgba(139,92,246,0.40), 0 0 120px rgba(139,92,246,0.12)",
                }}
              >
                <img
                  src={club.logo}
                  alt={club.name}
                  style={{ width: "128px", height: "128px", objectFit: "cover", display: "block" }}
                />
              </div>
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center mx-auto text-6xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.02)",
                  boxShadow: "0 0 60px rgba(139,92,246,0.40), 0 0 120px rgba(139,92,246,0.12)",
                }}
              >
                {emoji}
              </div>
            )}
          </motion.div>

          {/* Club name */}
          <h2
            className="font-black tracking-tighter text-white uppercase mb-2 leading-none"
            style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)" }}
          >
            {club.name}
          </h2>

          <p
            className="text-[10px] font-bold tracking-[0.4em] uppercase mb-8"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            {club.sport}
          </p>

          {/* Divider */}
          <div className="w-8 h-px mx-auto mb-6" style={{ background: "rgba(255,255,255,0.10)" }} />

          {/* StarApp wordmark small */}
          <div className="flex justify-center mb-5" style={{ opacity: 0.5 }}>
            <NovaWordmark dark={true} showTag={true} height={52} />
          </div>

          <a
            href="/"
            className="text-[10px] tracking-[0.28em] uppercase transition-colors"
            style={{ color: "rgba(255,255,255,0.18)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}
          >
            ← Cambiar club
          </a>
        </motion.div>
      </div>

      {/* ── RIGHT — login form ── */}
      <div className="flex-1 flex items-center justify-center px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="w-full max-w-[340px]"
        >
          {/* Mobile: club logo + wordmark */}
          <div className="lg:hidden flex flex-col items-center mb-7">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-3"
            >
              {club.logo ? (
                <div
                  className="w-16 h-16 rounded-full overflow-hidden"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 0 36px rgba(139,92,246,0.38)",
                  }}
                >
                  <img
                    src={club.logo}
                    alt={club.name}
                    style={{ width: "64px", height: "64px", objectFit: "cover", display: "block" }}
                  />
                </div>
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.02)",
                    boxShadow: "0 0 36px rgba(139,92,246,0.38)",
                  }}
                >
                  {emoji}
                </div>
              )}
            </motion.div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>
              {club.name}
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <p
              className="text-[10px] font-bold tracking-[0.38em] uppercase mb-2"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              Bienvenido de vuelta
            </p>
            <h1 className="text-[2.2rem] font-black tracking-tighter text-white leading-none">
              Inicia sesión
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                className="block text-[10px] font-bold tracking-[0.28em] uppercase mb-3"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Correo o Documento
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="username"
                className="w-full bg-transparent text-white text-sm pb-2.5 outline-none"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.14)",
                  color: "white",
                  caretColor: "#8B5CF6",
                  fontSize: "14px",
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = "rgba(255,255,255,0.42)")}
                onBlur={(e) => (e.target.style.borderBottomColor = "rgba(255,255,255,0.14)")}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label
                className="block text-[10px] font-bold tracking-[0.28em] uppercase mb-3"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-white text-sm pb-2.5 outline-none pr-7"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.14)",
                  color: "white",
                  caretColor: "#8B5CF6",
                  fontSize: "14px",
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = "rgba(255,255,255,0.42)")}
                onBlur={(e) => (e.target.style.borderBottomColor = "rgba(255,255,255,0.14)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-2.5 transition-colors"
                style={{ color: "rgba(255,255,255,0.25)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[12px] tracking-wide"
                style={{ color: "rgba(255,100,100,0.85)" }}
              >
                {error}
              </motion.p>
            )}

            {/* CTA */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 font-black text-[11px] tracking-[0.28em] uppercase transition-all duration-200"
                style={{
                  background: loading ? "rgba(255,255,255,0.07)" : "white",
                  color: loading ? "rgba(255,255,255,0.30)" : "#030308",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "rgba(255,255,255,0.88)";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "white";
                }}
              >
                {loading ? "Verificando ..." : "Ingresar →"}
              </button>
            </div>
          </form>

          {/* Register link */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-center text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.22)" }}>
              ¿Sin cuenta?{" "}
              <a
                href={`/register?club=${club.slug}`}
                className="font-bold transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >
                Regístrate
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
