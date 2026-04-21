"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { NovaWordmark } from "@/components/nova-logo";

function SpaceInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </label>
      )}
      <input
        className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1.5px solid ${error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.08)"}`,
          color: "rgba(255,255,255,0.88)",
          caretColor: "#8B5CF6",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.50)"; e.target.style.background = "rgba(139,92,246,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = error ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
        {...props}
      />
      {error && <p className="text-[11px]" style={{ color: "#F87171" }}>{error}</p>}
    </div>
  );
}

function SpaceSelect({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </label>
      )}
      <select
        className="w-full px-4 py-3 rounded-2xl text-sm outline-none appearance-none transition-all"
        style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.50)"; e.target.style.background = "rgba(139,92,246,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── section heading ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
      <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

export default function RegisterClient() {
  const search = useSearchParams();
  const codeParam = search.get("code") || "";
  const clubSlug = search.get("club") || "";
  const router = useRouter();

  const [isModalOpen, setModalOpen] = useState(!codeParam);
  const [modalRole, setModalRole] = useState<"PLAYER" | "COACH" | "PARENT" | "">("");
  const [modalCode, setModalCode] = useState(codeParam);
  const [modalError, setModalError] = useState("");

  const [code, setCode] = useState(codeParam);
  const [invite, setInvite] = useState<{ role: string; branches?: string[]; playerName?: string | null; club?: { name: string; slug: string; logo: string | null; zonePrices?: Record<string, number> | null } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", dateOfBirth: "", documentNumber: "", phone: "", address: "", parentName: "", parentEmail: "", parentPhone: "", parentRelation: "", emergencyContact: "", eps: "", branch: "" });

  const redirectSlug = invite?.club?.slug || clubSlug || null;

  const sedeOptions: string[] = (() => {
    const zp = invite?.club?.zonePrices;
    if (zp && Object.keys(zp).length > 0) return Object.keys(zp);
    if (invite?.branches && invite.branches.length > 0) return invite.branches;
    return [];
  })();

  useEffect(() => {
    if (!code) return;
    fetch(`/api/invites?code=${encodeURIComponent(code)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setInvite(d);
        // Auto-set role if code was in URL (no modal shown)
        if (d?.role && !modalRole) setModalRole(d.role.toUpperCase() as "PLAYER" | "COACH" | "PARENT");
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleModalContinue() {
    setModalError("");
    if (!modalRole) { setModalError("Selecciona el tipo de registro"); return; }
    if (!modalCode) { setModalError("Ingresa el código de registro"); return; }
    try {
      const res = await fetch(`/api/invites?code=${encodeURIComponent(modalCode)}`);
      if (!res.ok) { setModalError("Código inválido"); return; }
      const inv = await res.json();
      if ((inv?.role || "PLAYER").toUpperCase() !== modalRole) { setModalError("El código no corresponde al tipo seleccionado"); return; }
      setInvite(inv);
      setCode(modalCode);
      setModalOpen(false);
    } catch { setModalError("Error verificando código"); }
  }

  const isMinor = (() => {
    if (!form.dateOfBirth) return false;
    const today = new Date();
    const birth = new Date(form.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modalRole === "COACH" || modalRole === "PARENT") {
      if (form.password.length < 6) { alert("La contraseña debe tener al menos 6 caracteres."); return; }
      if (form.password !== form.confirmPassword) { alert("Las contraseñas no coinciden."); return; }
    }
    if (isMinor && (!form.parentName || !form.parentPhone || !form.parentRelation)) {
      alert("El deportista es menor de edad. Los datos del acudiente son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { code, name: form.name, email: form.email, dateOfBirth: form.dateOfBirth, documentNumber: form.documentNumber, phone: form.phone };
      if (modalRole === "COACH") { payload.password = form.password; payload.phone = form.phone || undefined; payload.emergencyContact = form.emergencyContact || undefined; payload.eps = form.eps || undefined; payload.branch = form.branch || undefined; }
      if (modalRole === "PLAYER") { payload.address = form.address || undefined; payload.zone = form.branch || undefined; payload.parentName = form.parentName || undefined; payload.parentPhone = form.parentPhone || undefined; payload.parentRelation = form.parentRelation || undefined; }
      if (modalRole === "PARENT") { payload.password = form.password; payload.phone = form.phone || undefined; payload.relation = form.parentRelation || undefined; }
      const res = await fetch("/api/invites/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        if (modalRole === "PARENT") {
          const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
          if (login?.ok) { router.push("/dashboard/parent"); return; }
        }
        alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        router.push(redirectSlug ? `/${redirectSlug}` : "/");
      } else {
        alert(data.error || "Error al registrar");
      }
    } catch { alert("Error al registrar"); }
    finally { setLoading(false); }
  }

  const clubName = invite?.club?.name;
  const clubLogo = invite?.club?.logo;

  // ── MODAL — código + tipo ───────────────────────────────────────────────────
  if (isModalOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#030308" }}>
        {/* subtle nebula */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 65% 50% at 15% 25%, rgba(76,29,149,0.18) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 85% 70%, rgba(29,78,216,0.10) 0%, transparent 50%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="flex justify-center mb-8">
            <NovaWordmark dark={true} showTag={true} height={44} />
          </div>

          <div
            className="rounded-3xl p-6"
            style={{ background: "rgba(14,12,40,0.82)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", boxShadow: "0 24px 60px rgba(0,0,0,0.50)" }}
          >
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>
              Acceso
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white mb-6">Registrarse</h1>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["PLAYER", "COACH"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setModalRole(r)}
                  className="py-3 rounded-2xl text-[12px] font-bold tracking-wide transition-all"
                  style={{
                    background: modalRole === r
                      ? "linear-gradient(135deg, #7C3AED, #4338CA)"
                      : "rgba(255,255,255,0.04)",
                    color: modalRole === r ? "white" : "rgba(255,255,255,0.40)",
                    border: `1.5px solid ${modalRole === r ? "rgba(139,92,246,0.50)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: modalRole === r ? "0 4px 16px rgba(124,58,237,0.25)" : "none",
                  }}
                >
                  {r === "PLAYER" ? "🏅 Deportista" : "🏋️ Entrenador"}
                </button>
              ))}
            </div>

            <SpaceInput
              placeholder="Código de registro"
              value={modalCode}
              onChange={(e) => setModalCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleModalContinue()}
            />

            {modalError && (
              <p className="text-xs mt-2 px-2 py-1.5 rounded-xl text-center" style={{ color: "#F87171", background: "rgba(239,68,68,0.10)" }}>{modalError}</p>
            )}

            <button
              onClick={handleModalContinue}
              className="w-full mt-5 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4338CA 100%)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }}
            >
              Continuar →
            </button>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.28)" }}>
            ¿Ya tienes cuenta?{" "}
            <a href={redirectSlug ? `/${redirectSlug}` : "/"} className="font-semibold" style={{ color: "rgba(167,139,250,0.80)" }}>
              Inicia sesión
            </a>
          </p>
        </motion.div>
      </div>
    );
  }

  // ── FORM — datos del registro ───────────────────────────────────────────────
  return (
    <div className="min-h-screen py-10 px-6" style={{ background: "#030308" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 65% 50% at 15% 25%, rgba(76,29,149,0.15) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 85% 70%, rgba(29,78,216,0.09) 0%, transparent 50%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        {/* Back */}
        <a
          href={redirectSlug ? `/${redirectSlug}` : "/"}
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase mb-6 transition-colors"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
        >
          ← Volver
        </a>

        {/* Club + Nova header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {modalRole === "COACH" ? "Registro de entrenador" : modalRole === "PARENT" ? "Registro de padre / tutor" : "Registro de deportista"}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {clubName ?? "Registro"}
            </h1>
          </div>
          {clubLogo && (
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: "1px solid rgba(139,92,246,0.40)", boxShadow: "0 0 20px rgba(139,92,246,0.25)" }}
            >
              <img src={clubLogo} alt={clubName} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* PARENT — player banner */}
        {modalRole === "PARENT" && invite?.playerName && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-6"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(52,211,153,0.15)" }}>
              <span className="text-base">👶</span>
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#34D399" }}>Vinculando a</p>
              <p className="text-sm font-black text-white">{invite.playerName}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SectionLabel>Datos principales</SectionLabel>

          <SpaceInput label="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" required />
          <SpaceInput label="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" required />
          {modalRole !== "PARENT" && (
            <SpaceInput label="Número de documento" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="Cédula / pasaporte" required />
          )}
          {modalRole !== "PARENT" && (
            <SpaceInput label="Teléfono / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 000 0000" />
          )}

          {modalRole !== "PARENT" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.45)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
              {isMinor && (
                <p className="text-[11px]" style={{ color: "rgba(251,146,60,0.90)" }}>
                  Menor de edad — datos del acudiente requeridos.
                </p>
              )}
            </div>
          )}

          {/* COACH extra fields */}
          {modalRole === "COACH" && (
            <>
              <SectionLabel>Acceso</SectionLabel>
              <SpaceInput label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" minLength={6} required />
              <SpaceInput label="Confirmar contraseña" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repite la contraseña" minLength={6} required />
              <SectionLabel>Información adicional</SectionLabel>
              <SpaceInput label="Contacto de emergencia" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Nombre y teléfono" />
              <SpaceInput label="EPS / Seguro médico" value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} placeholder="Nombre de la EPS" />
              {sedeOptions.length > 0 ? (
                <SpaceSelect label="Sede / Zona" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                  <option value="">Seleccionar sede</option>
                  {sedeOptions.map((s) => <option key={s} value={s} style={{ background: "#0E0E2C" }}>{s}</option>)}
                </SpaceSelect>
              ) : (
                <SpaceInput label="Sede / Zona" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="Ej: NORTE, SUR, CENTRO" />
              )}
            </>
          )}

          {/* PARENT extra fields */}
          {modalRole === "PARENT" && (
            <>
              <SectionLabel>Acceso</SectionLabel>
              <SpaceInput label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" minLength={6} required />
              <SpaceInput label="Confirmar contraseña" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repite la contraseña" minLength={6} required />
              <SectionLabel>Información</SectionLabel>
              <SpaceInput label="Teléfono / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 000 0000" />
              <SpaceSelect label="Relación con el deportista" value={form.parentRelation} onChange={(e) => setForm({ ...form, parentRelation: e.target.value })}>
                <option value="">Seleccionar relación</option>
                {["Padre", "Madre", "Abuelo/a", "Tío/a", "Hermano/a", "Acudiente"].map((r) => (
                  <option key={r} value={r} style={{ background: "#0E0E2C" }}>{r}</option>
                ))}
              </SpaceSelect>
            </>
          )}

          {/* PLAYER extra fields */}
          {modalRole === "PLAYER" && (
            <>
              <SpaceInput label="Dirección de residencia" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Barrio / dirección" />
              {sedeOptions.length > 0 && (
                <SpaceSelect label="Sede / Zona" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                  <option value="">Seleccionar sede</option>
                  {sedeOptions.map((s) => <option key={s} value={s} style={{ background: "#0E0E2C" }}>{s}</option>)}
                </SpaceSelect>
              )}
              <SectionLabel>Acudiente {isMinor ? "(obligatorio)" : "(opcional)"}</SectionLabel>
              <SpaceInput label="Nombre del acudiente" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="Nombre completo" required={isMinor} />
              <SpaceInput label="WhatsApp del acudiente" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="+57 300 000 0000" required={isMinor} />
              <SpaceSelect label="Relación con el deportista" value={form.parentRelation} onChange={(e) => setForm({ ...form, parentRelation: e.target.value })} required={isMinor}>
                <option value="">Seleccionar relación</option>
                {["Padre", "Madre", "Abuelo/a", "Tío/a", "Hermano/a", "Acudiente"].map((r) => (
                  <option key={r} value={r} style={{ background: "#0E0E2C" }}>{r}</option>
                ))}
              </SpaceSelect>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
                La contraseña del deportista y del acudiente será el número de documento.
              </p>
            </>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4338CA 100%)",
                color: "white",
                boxShadow: "0 8px 24px rgba(124,58,237,0.30)",
              }}
            >
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Registrando...</>
                : "Completar registro →"}
            </button>
          </div>
        </form>

        <div className="flex justify-center mt-8">
          <NovaWordmark dark={true} showTag={false} height={28} />
        </div>
      </motion.div>
    </div>
  );
}
