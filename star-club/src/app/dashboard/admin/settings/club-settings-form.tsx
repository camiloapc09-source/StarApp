"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Settings, Building2, MapPin, Mail, Activity, CreditCard,
  Percent, DollarSign, Upload, Check, Loader2, Image as ImageIcon, Shield,
} from "lucide-react";

interface ZonePrices {
  SUR: number;
  CENTRO: number;
  NORTE: number;
}

interface ClubSettingsFormProps {
  club: {
    id: string;
    name: string;
    city: string | null;
    email: string | null;
    sport: string;
    logo: string | null;
    billingCycleDay: number;
    earlyPaymentDays: number;
    earlyPaymentDiscount: number;
    zonePrices: unknown;
    coachCanInvite: boolean;
  };
}

function parseZonePrices(raw: unknown): ZonePrices {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      SUR:    typeof obj.SUR    === "number" ? obj.SUR    : 0,
      CENTRO: typeof obj.CENTRO === "number" ? obj.CENTRO : 0,
      NORTE:  typeof obj.NORTE  === "number" ? obj.NORTE  : 0,
    };
  }
  return { SUR: 0, CENTRO: 0, NORTE: 0 };
}

export default function ClubSettingsForm({ club }: ClubSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName]       = useState(club.name);
  const [city, setCity]       = useState(club.city ?? "");
  const [email, setEmail]     = useState(club.email ?? "");
  const [sport, setSport]     = useState(club.sport);
  const [billingDay, setBillingDay]           = useState(club.billingCycleDay);
  const [earlyDays, setEarlyDays]             = useState(club.earlyPaymentDays);
  const [earlyDiscount, setEarlyDiscount]     = useState(club.earlyPaymentDiscount);
  const [zonePrices, setZonePrices]           = useState<ZonePrices>(parseZonePrices(club.zonePrices));
  const [coachCanInvite, setCoachCanInvite]   = useState(club.coachCanInvite);
  const [logoPreview, setLogoPreview]         = useState<string | null>(club.logo);
  const [logoFile, setLogoFile]               = useState<File | null>(null);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    setError(null);
    setSaved(false);

    try {
      // Upload logo first if changed
      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const res = await fetch("/api/admin/club", { method: "PATCH", body: fd });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Error al subir logo");
        }
      }

      // Save text settings
      const res = await fetch("/api/admin/club", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || null,
          email: email.trim() || null,
          sport: sport.trim(),
          billingCycleDay: billingDay,
          earlyPaymentDays: earlyDays,
          earlyPaymentDiscount: earlyDiscount,
          zonePrices,
          coachCanInvite,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al guardar");
      }

      setSaved(true);
      startTransition(() => router.refresh());
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all`;
  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.90)",
  };

  const labelCls = "block text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5";
  const labelStyle = { color: "rgba(255,255,255,0.38)" };

  return (
    <div className="space-y-5">

      {/* Club identity */}
      <Card>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.20)" }}>
            <Building2 size={15} style={{ color: "#A78BFA" }} />
          </div>
          <h2 className="font-bold text-[15px]">Identidad del club</h2>
        </div>

        {/* Logo upload */}
        <div className="mb-5">
          <label className={labelCls} style={labelStyle}>Logo del club</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden transition-all hover:opacity-80"
              style={{
                background: logoPreview ? "transparent" : "rgba(139,92,246,0.08)",
                border: "2px dashed rgba(139,92,246,0.30)",
              }}
            >
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                : <ImageIcon size={24} style={{ color: "rgba(139,92,246,0.50)" }} />
              }
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#C4B5FD" }}
              >
                <Upload size={13} /> Cambiar logo
              </button>
              <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                JPG, PNG, WEBP o SVG · máx. 2 MB
              </p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Nombre del club</label>
            <input className={inputCls} style={inputStyle} value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Ej: Club Estrellas FC" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Deporte</label>
            <select className={inputCls} style={{ ...inputStyle, cursor: "pointer" }}
              value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="FOOTBALL">Fútbol</option>
              <option value="BASKETBALL">Baloncesto</option>
              <option value="VOLLEYBALL">Voleibol</option>
              <option value="SWIMMING">Natación</option>
              <option value="TENNIS">Tenis</option>
              <option value="ATHLETICS">Atletismo</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}><MapPin size={9} className="inline mr-1" />Ciudad</label>
            <input className={inputCls} style={inputStyle} value={city}
              onChange={(e) => setCity(e.target.value)} placeholder="Ej: Bogotá" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}><Mail size={9} className="inline mr-1" />Email del club</label>
            <input className={inputCls} style={inputStyle} value={email} type="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="contacto@miclub.com" />
          </div>
        </div>
      </Card>

      {/* Billing */}
      <Card>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.20)" }}>
            <CreditCard size={15} style={{ color: "#93C5FD" }} />
          </div>
          <h2 className="font-bold text-[15px]">Facturación</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Día de corte (1-28)</label>
            <input className={inputCls} style={inputStyle} type="number" min={1} max={28}
              value={billingDay} onChange={(e) => setBillingDay(Number(e.target.value))} />
            <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
              El ciclo empieza este día cada mes
            </p>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}><Percent size={9} className="inline mr-1" />Días pronto pago</label>
            <input className={inputCls} style={inputStyle} type="number" min={0} max={30}
              value={earlyDays} onChange={(e) => setEarlyDays(Number(e.target.value))} />
            <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
              Días desde el corte para descuento
            </p>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}><DollarSign size={9} className="inline mr-1" />Descuento pronto pago ($)</label>
            <input className={inputCls} style={inputStyle} type="number" min={0}
              value={earlyDiscount} onChange={(e) => setEarlyDiscount(Number(e.target.value))} />
            <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>
              Descuento fijo en pesos
            </p>
          </div>
        </div>
      </Card>

      {/* Zone prices */}
      <Card>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.20)" }}>
            <Activity size={15} style={{ color: "#6EE7B7" }} />
          </div>
          <div>
            <h2 className="font-bold text-[15px]">Precios por zona</h2>
          </div>
        </div>
        <p className="text-[12px] mb-4" style={{ color: "rgba(255,255,255,0.38)" }}>
          Mensualidad base por zona geográfica (usado al generar pagos automáticos)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["SUR", "CENTRO", "NORTE"] as const).map((zone) => (
            <div key={zone}>
              <label className={labelCls} style={labelStyle}>Zona {zone}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: "rgba(255,255,255,0.35)" }}>$</span>
                <input
                  className={inputCls}
                  style={{ ...inputStyle, paddingLeft: "1.75rem" }}
                  type="number" min={0} step={1000}
                  value={zonePrices[zone]}
                  onChange={(e) => setZonePrices((prev) => ({ ...prev, [zone]: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Permissions */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <Shield size={15} style={{ color: "#FDE68A" }} />
          </div>
          <div>
            <h2 className="font-bold text-[15px]">Permisos de entrenadores</h2>
          </div>
        </div>

        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-sm font-semibold">Generar códigos de invitación</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
              Permite a los entrenadores crear códigos para registrar nuevos deportistas
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCoachCanInvite((v) => !v)}
            className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 ml-4"
            style={{
              background: coachCanInvite
                ? "rgba(52,211,153,0.80)"
                : "rgba(255,255,255,0.12)",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: coachCanInvite ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </Card>

      {/* Save */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
          {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={isPending}
        className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{
          background: saved
            ? "rgba(52,211,153,0.15)"
            : "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
          border: saved ? "1px solid rgba(52,211,153,0.30)" : "none",
          color: saved ? "#6EE7B7" : "#fff",
        }}
      >
        {isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Guardando…</>
        ) : saved ? (
          <><Check size={16} /> Cambios guardados</>
        ) : (
          <><Settings size={16} /> Guardar configuración</>
        )}
      </button>
    </div>
  );
}
