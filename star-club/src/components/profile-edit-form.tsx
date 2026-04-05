"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, PersonStanding, Heart, Check, Loader2, ChevronDown } from "lucide-react";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  emergencyContact: string | null;
  eps: string | null;
  role: string;
  playerProfile: {
    address: string | null;
    position: string | null;
    jerseyNumber: number | null;
    dateOfBirth: string | null;
    documentNumber: string | null;
  } | null;
  parentProfile: {
    phone: string | null;
    relation: string | null;
  } | null;
};

export default function ProfileEditForm({
  profile,
  takenJerseyNumbers = [],
}: {
  profile: Profile;
  takenJerseyNumbers?: number[];
}) {
  const router = useRouter();
  const [data, setData] = useState({
    name: profile.name,
    phone: profile.phone ?? "",
    emergencyContact: profile.emergencyContact ?? "",
    eps: profile.eps ?? "",
    address: profile.playerProfile?.address ?? "",
    position: profile.playerProfile?.position ?? "",
    jerseyNumber: profile.playerProfile?.jerseyNumber != null ? String(profile.playerProfile.jerseyNumber) : "",
    relation: profile.parentProfile?.relation ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jerseyError, setJerseyError] = useState<string | null>(null);

  function handleJerseyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setData((d) => ({ ...d, jerseyNumber: val }));
    if (val === "") { setJerseyError(null); return; }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 99) { setJerseyError("El dorsal debe ser entre 0 y 99."); return; }
    if (takenJerseyNumbers.includes(num)) {
      setJerseyError(`El #${num} ya está en uso por otro jugador.`);
    } else {
      setJerseyError(null);
    }
  }

  const set = (key: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    if (jerseyError) { setSaving(false); return; }
    const jerseyNum = data.jerseyNumber !== "" ? parseInt(data.jerseyNumber, 10) : null;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        emergencyContact: data.emergencyContact || null,
        eps: data.eps || null,
        address: data.address || null,
        position: data.position || null,
        jerseyNumber: jerseyNum,
        relation: data.relation || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal info */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Información personal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              <User size={12} className="inline mr-1" />Nombre completo
            </label>
            <input value={data.name} onChange={set("name")} required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input value={profile.email} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              <Phone size={12} className="inline mr-1" />Teléfono de registro
            </label>
            <input value={profile.phone ?? ""} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>El teléfono proviene de tu registro de WhatsApp.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              <Heart size={12} className="inline mr-1" />Contacto de emergencia
            </label>
            <input value={data.emergencyContact} onChange={set("emergencyContact")} placeholder="Nombre y teléfono" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              EPS
            </label>
            <input value={data.eps} onChange={set("eps")} placeholder="Sura, Compensar..." className={inputCls} style={inputStyle} />
          </div>
        </div>
      </section>

      {/* Player-specific */}
      {profile.role === "PLAYER" && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Información deportiva
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <MapPin size={12} className="inline mr-1" />Dirección
              </label>
              <input value={data.address} onChange={set("address")} placeholder="Calle, barrio, ciudad" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <PersonStanding size={12} className="inline mr-1" />Posición
              </label>
              <div className="relative">
                <select
                  value={data.position}
                  onChange={(e) => setData((d) => ({ ...d, position: e.target.value }))}
                  className={inputCls}
                  style={{ ...inputStyle, appearance: "none", paddingRight: "2.5rem" }}
                >
                  <option value="">Seleccionar posición...</option>
                  <option value="Base">Base (Point Guard)</option>
                  <option value="Escolta">Escolta (Shooting Guard)</option>
                  <option value="Alero">Alero (Small Forward)</option>
                  <option value="Ala-Pívot">Ala-Pívot (Power Forward)</option>
                  <option value="Pívot">Pívot (Center)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Dorsal (Número de camiseta)
              </label>
              <input
                type="number"
                min={0}
                max={99}
                value={data.jerseyNumber}
                onChange={handleJerseyChange}
                placeholder="Ej: 23"
                className={inputCls}
                style={jerseyError ? { ...inputStyle, borderColor: "var(--error)" } : inputStyle}
              />
              {jerseyError ? (
                <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{jerseyError}</p>
              ) : (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Elige tu número del 0 al 99.</p>
              )}
            </div>
            {profile.playerProfile?.documentNumber && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Documento</label>
                <input value={profile.playerProfile.documentNumber} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Parent-specific */}
      {profile.role === "PARENT" && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Datos del tutor
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Relación con el jugador
            </label>
            <input value={data.relation} onChange={set("relation")} placeholder="Padre, madre, tutor..." className={inputCls} style={inputStyle} />
          </div>
        </section>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all"
          style={{ background: saved ? "var(--success)" : "var(--accent)", color: "#000" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
