"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Zap } from "lucide-react";
import { motion } from "framer-motion";

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

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left — club branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex-col items-center justify-center p-16 relative overflow-hidden">
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
            bottom: -100,
            right: -100,
            pointerEvents: "none",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center"
        >
          {club.logo ? (
            <motion.div
              className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6"
              style={{ border: "2px solid var(--accent)" }}
              animate={{
                boxShadow: [
                  "0 0 20px rgba(139,92,246,0.3)",
                  "0 0 50px rgba(139,92,246,0.55)",
                  "0 0 20px rgba(139,92,246,0.3)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={club.logo} alt={club.name} style={{ width: "128px", height: "128px", objectFit: "cover", display: "block", borderRadius: "50%" }} />
            </motion.div>
          ) : (
            <div className="text-7xl mb-6">{emoji}</div>
          )}
          <h2 className="text-4xl font-black tracking-tighter mb-2 text-[var(--text-primary)]">
            {club.name}
          </h2>
          <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4">
            {club.sport}
          </p>
          <p className="text-[var(--text-secondary)] text-sm mt-8">
            Plataforma deportiva · Powered by StarApp
          </p>
        </motion.div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Club logo / emoji */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {club.logo ? (
              <motion.div
                className="w-24 h-24 rounded-full overflow-hidden mb-3"
                style={{ border: "2px solid var(--accent)" }}
                animate={{
                  boxShadow: [
                    "0 0 15px rgba(139,92,246,0.3)",
                    "0 0 38px rgba(139,92,246,0.65)",
                    "0 0 15px rgba(139,92,246,0.3)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src={club.logo} alt={club.name} style={{ width: "96px", height: "96px", objectFit: "cover", display: "block", borderRadius: "50%" }} />
              </motion.div>
            ) : (
              <motion.div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-3 text-5xl"
                style={{ border: "2px solid var(--accent)", background: "var(--bg-elevated)" }}
                animate={{
                  boxShadow: [
                    "0 0 15px rgba(139,92,246,0.3)",
                    "0 0 38px rgba(139,92,246,0.65)",
                    "0 0 15px rgba(139,92,246,0.3)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {emoji}
              </motion.div>
            )}
            <span
              className="font-black text-xs tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              {club.name.toUpperCase()}
            </span>
          </motion.div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Bienvenido</h1>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              Inicia sesión en tu cuenta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Zap size={16} className="animate-pulse" />
                  Ingresando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            ¿No tienes cuenta?{" "}
            <a
              href={`/register?club=${club.slug}`}
              className="font-medium hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Regístrate
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
