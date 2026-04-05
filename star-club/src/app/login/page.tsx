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
            background: "radial-gradient(circle, rgba(0,255,135,0.08) 0%, transparent 70%)",
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
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-8">
            <span className="text-black font-black text-2xl">SC</span>
          </div>

          <h2 className="text-4xl font-black tracking-tighter mb-4 text-[var(--text-primary)]">STAR CLUB</h2>
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
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <span className="text-black font-black text-sm">SC</span>
            </div>
            <span className="font-bold text-xl">STAR CLUB</span>
          </div>

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
