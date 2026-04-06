"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { getClientDictionary } from "@/lib/client-dict";

export default function LoginPage() {
  const dict = getClientDictionary();
  const router = useRouter();
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
      setError(dict.login.invalidCredentials);
      return;
    }

    // Hard reload to "/": the home page server component detects the session
    // and redirects to the correct role dashboard (/dashboard/admin, /dashboard/coach, etc.)
    window.location.replace("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Background accent */}
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
          {/* StarApp platform brand */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ background: "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)", boxShadow: "0 0 32px rgba(139,92,246,0.40)" }}>
            <span className="text-white font-black text-3xl tracking-tighter">S</span>
          </div>

          <h2 className="text-4xl font-black tracking-tighter mb-2 text-[var(--text-primary)]">StarApp</h2>
          <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-4">Plataforma Deportiva</p>
          <p className="text-[var(--text-secondary)] text-lg mb-12 leading-relaxed max-w-sm">{dict.home.heroDescription}</p>

          {/* Features */}
          <div className="space-y-4 text-left">
            {dict.home.features.map((text) => (
              <div key={text} className="flex items-center gap-3 text-[var(--text-secondary)]">
                <span className="text-xl">🏆</span>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
          {/* Logo animado — visible en todos los tamaños */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
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
              <img src="/logo.jpeg" alt="Star Club" className="w-full h-full object-cover" />
            </motion.div>
            <span className="font-black text-xs tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>STAR CLUB</span>
          </motion.div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">{dict.login.welcomeBack}</h1>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">{dict.login.signInPrompt}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="email" type="email" label={dict.login.emailLabel} placeholder={dict.login.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} label={dict.login.passwordLabel} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                {error}
              </motion.p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Zap size={16} className="animate-pulse" />
                  {dict.login.signingIn}
                </>
              ) : (
                dict.login.signInButton
              )}
            </Button>
          </form>


        </motion.div>
      </div>
    </div>
  );
}
