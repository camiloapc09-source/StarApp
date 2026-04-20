"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { NovaWordmark } from "@/components/nova-logo";
import {
  Building2, User, Mail, Lock, MapPin, Activity, Key,
  ArrowRight, ArrowLeft, Check, Loader2, Eye, EyeOff, ShieldCheck,
} from "lucide-react";

const SPORTS = [
  { value: "FOOTBALL",   label: "Fútbol" },
  { value: "BASKETBALL", label: "Baloncesto" },
  { value: "VOLLEYBALL", label: "Voleibol" },
  { value: "SWIMMING",   label: "Natación" },
  { value: "TENNIS",     label: "Tenis" },
  { value: "ATHLETICS",  label: "Atletismo" },
  { value: "OTHER",      label: "Otro deporte" },
];

type Step = 1 | 2 | 3 | 4;

const PLAN_LABEL: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLOR: Record<string, string> = {
  STARTER: "#93C5FD",
  PRO: "#C4B5FD",
  ENTERPRISE: "#FCD34D",
};

export default function CreateClubPage() {
  const router = useRouter();

  const [step, setStep]           = useState<Step>(1);

  // Step 1 — access code
  const [accessCode, setAccessCode] = useState("");
  const [codeValid, setCodeValid]   = useState<{ plan: string } | null>(null);
  const [codeError, setCodeError]   = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // Step 2 — club info
  const [clubName, setClubName]   = useState("");
  const [sport, setSport]         = useState("FOOTBALL");
  const [city, setCity]           = useState("");

  // Step 3 — admin account
  const [adminName, setAdminName] = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);

  // Step 4 — submit
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState<{ slug: string; plan: string } | null>(null);

  async function validateCode() {
    setCodeError(null);
    setValidating(true);
    try {
      const res = await fetch(`/api/access-codes?code=${encodeURIComponent(accessCode.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCodeError(data.reason ?? "Código inválido");
        setCodeValid(null);
      } else {
        setCodeValid({ plan: data.plan });
      }
    } catch {
      setCodeError("Error al validar el código");
    } finally {
      setValidating(false);
    }
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode: accessCode.trim(),
          clubName, sport,
          city: city || undefined,
          adminName, adminEmail: email, password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el club");

      // Auto-login: sign in with the just-created credentials
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.ok) {
        // Redirect directly to admin dashboard
        router.push("/dashboard/admin");
      } else {
        // Login failed for some reason, fall back to showing login link
        setDone({ slug: data.slug, plan: data.plan ?? "STARTER" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = `w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all`;
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.90)",
  };
  const labelCls = "block text-[11px] font-bold tracking-[0.18em] uppercase mb-1.5 text-white/40";

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(109,40,217,0.18) 0%, #050512 70%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <Check size={28} style={{ color: "#34D399" }} />
          </div>
          <h1 className="text-2xl font-black mb-2">¡Club creado!</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.50)" }}>
            <strong className="text-white">{clubName}</strong> está listo. Inicia sesión con tu cuenta de administrador.
          </p>
          <div className="rounded-2xl p-4 mb-6 text-left"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tu URL de acceso
            </p>
            <p className="text-sm font-mono font-bold" style={{ color: "#A78BFA" }}>/{done.slug}</p>
            {done.plan && (
              <p className="text-xs mt-1.5" style={{ color: PLAN_COLOR[done.plan] ?? "rgba(255,255,255,0.40)" }}>
                Plan {PLAN_LABEL[done.plan] ?? done.plan}
              </p>
            )}
          </div>
          <button onClick={() => router.push(`/${done.slug}`)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
            Ir a iniciar sesión <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function StepDots() {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="transition-all duration-300"
            style={{
              width: s === step ? 20 : 8, height: 8, borderRadius: 4,
              background: s === step ? "#8B5CF6" : s < step ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.12)",
            }} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(109,40,217,0.18) 0%, #050512 70%)" }}>

      <div className="mb-8" style={{ filter: "drop-shadow(0 0 16px rgba(139,92,246,0.35))" }}>
        <NovaWordmark dark height={36} />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-3xl p-8"
          style={{
            background: "rgba(10,10,28,0.90)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}>
          <StepDots />

          {/* ── Step 1: Código de acceso ─────────────────── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-black mb-1">Código de acceso</h1>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.40)" }}>
                Ingresa el código que recibiste al contratar StarApp
              </p>

              <div>
                <label className={labelCls}>Tu código</label>
                <div className="relative">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                  <input
                    className={`${inputCls} uppercase tracking-widest font-mono`}
                    style={{ ...inputStyle, letterSpacing: "0.12em" }}
                    value={accessCode}
                    onChange={(e) => { setAccessCode(e.target.value.toUpperCase()); setCodeValid(null); setCodeError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && accessCode.trim().length > 6) validateCode(); }}
                    placeholder="XXXX-XXXX-XXXX"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>

              {codeError && (
                <div className="mt-3 rounded-xl px-4 py-2.5 text-sm font-medium"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", color: "#F87171" }}>
                  {codeError}
                </div>
              )}

              {codeValid && (
                <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}>
                  <ShieldCheck size={14} style={{ color: "#34D399" }} />
                  <span className="text-sm font-semibold" style={{ color: "#34D399" }}>
                    Código válido — Plan {PLAN_LABEL[codeValid.plan] ?? codeValid.plan}
                  </span>
                </div>
              )}

              <div className="mt-6 space-y-2">
                {!codeValid ? (
                  <button
                    disabled={accessCode.trim().length < 6 || validating}
                    onClick={validateCode}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}
                  >
                    {validating
                      ? <><Loader2 size={15} className="animate-spin" /> Validando…</>
                      : <><Check size={15} /> Validar código</>}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}
                  >
                    Continuar <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Club info ───────────────────────── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-black mb-1">Tu club</h1>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.40)" }}>
                Cuéntanos sobre tu club deportivo
              </p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre del club</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <input className={inputCls} style={inputStyle} value={clubName}
                      onChange={(e) => setClubName(e.target.value)} placeholder="Ej: Club Estrellas FC" autoFocus />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Deporte principal</label>
                  <div className="relative">
                    <Activity size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <select className={`${inputCls} cursor-pointer`} style={inputStyle} value={sport} onChange={(e) => setSport(e.target.value)}>
                      {SPORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Ciudad <span className="font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.25)" }}>(opcional)</span></label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <input className={inputCls} style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Bogotá" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)" }}>
                  <ArrowLeft size={14} /> Atrás
                </button>
                <button disabled={clubName.trim().length < 2} onClick={() => setStep(3)}
                  className="flex-[2] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
                  Continuar <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Admin account ──────────────────── */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-black mb-1">Tu cuenta</h1>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.40)" }}>
                Serás el administrador del club
              </p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Tu nombre</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <input className={inputCls} style={inputStyle} value={adminName}
                      onChange={(e) => setAdminName(e.target.value)} placeholder="Nombre completo" autoFocus />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <input className={inputCls} style={inputStyle} type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
                    <input className={`${inputCls} pr-11`} style={inputStyle}
                      type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.30)" }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)" }}>
                  <ArrowLeft size={14} /> Atrás
                </button>
                <button
                  disabled={adminName.trim().length < 2 || !email.includes("@") || password.length < 8}
                  onClick={() => setStep(4)}
                  className="flex-[2] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
                  Continuar <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ─────────────────────────── */}
          {step === 4 && (
            <div>
              <h1 className="text-xl font-black mb-1">Confirmar</h1>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.40)" }}>
                Revisa los datos antes de crear tu club
              </p>
              <div className="space-y-2 mb-5">
                {[
                  { label: "Código",  value: accessCode },
                  { label: "Club",    value: clubName },
                  { label: "Deporte", value: SPORTS.find(s => s.value === sport)?.label ?? sport },
                  { label: "Ciudad",  value: city || "—" },
                  { label: "Admin",   value: adminName },
                  { label: "Email",   value: email },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
                    <span className="text-sm font-semibold truncate ml-4 font-mono" style={{ color: "rgba(255,255,255,0.85)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div className="rounded-xl px-4 py-2.5 mb-4 text-sm font-medium"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)" }}>
                  <ArrowLeft size={14} /> Atrás
                </button>
                <button disabled={loading} onClick={submit}
                  className="flex-[2] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Creando…</>
                    : <><Check size={15} /> Crear club</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.28)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold hover:opacity-80" style={{ color: "#A78BFA" }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
