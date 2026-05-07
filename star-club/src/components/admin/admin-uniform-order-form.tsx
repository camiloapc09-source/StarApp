"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, ChevronDown, X, Plus } from "lucide-react";

const SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

const CATALOG = [
  { type: "TRAINING",     name: "Entrenamiento",    price: 75000  },
  { type: "GAME",         name: "Juego doble faz",  price: 100000 },
  { type: "PRESENTATION", name: "Presentación",     price: 150000 },
] as const;

type Player = { id: string; name: string };

export default function AdminUniformOrderForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [open, setOpen]                     = useState(false);
  const [playerId, setPlayerId]             = useState("");
  const [type, setType]                     = useState("TRAINING");
  const [jerseySize, setJerseySize]         = useState("M");
  const [shortsSize, setShortsSize]         = useState("M");
  const [nameOnJersey, setNameOnJersey]     = useState("");
  const [numberOnJersey, setNumberOnJersey] = useState("");
  const [notes, setNotes]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const isGame = type === "GAME";

  async function submit() {
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      playerId,
      type,
      jerseySize,
      shortsSize,
      nameOnJersey: nameOnJersey.trim(),
      notes: notes.trim() || undefined,
    };
    if (numberOnJersey !== "") payload.numberOnJersey = parseInt(numberOnJersey, 10);

    const res = await fetch("/api/admin/uniforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setOpen(false);
      setPlayerId("");
      setType("TRAINING");
      setJerseySize("M");
      setShortsSize("M");
      setNameOnJersey("");
      setNumberOnJersey("");
      setNotes("");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear pedido");
    }
    setLoading(false);
  }

  const inputCls   = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  const SelectField = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} style={{ ...inputStyle, appearance: "none", paddingRight: "2rem" }}>
          {children}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
      >
        <Plus size={14} /> Crear pedido
      </button>
    );
  }

  const canSubmit = playerId && nameOnJersey.trim() && (!isGame || numberOnJersey !== "");

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nuevo pedido de uniforme</p>
        <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Player */}
        <div className="col-span-2">
          <SelectField label="Jugador" value={playerId} onChange={setPlayerId}>
            <option value="">Selecciona un jugador…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectField>
        </div>

        {/* Type */}
        <div className="col-span-2">
          <SelectField label="Tipo de uniforme" value={type} onChange={setType}>
            {CATALOG.map((c) => (
              <option key={c.type} value={c.type}>{c.name} — ${c.price.toLocaleString("es-CO")}</option>
            ))}
          </SelectField>
        </div>

        {/* Sizes */}
        <SelectField label="Talla camiseta" value={jerseySize} onChange={setJerseySize}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>
        <SelectField label="Talla pantaloneta" value={shortsSize} onChange={setShortsSize}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>

        {/* Name on jersey */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nombre en camiseta</label>
          <input
            type="text"
            value={nameOnJersey}
            onChange={(e) => setNameOnJersey(e.target.value)}
            placeholder={isGame ? "Apellido del jugador…" : "Nombre o apodo…"}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Number */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Número {isGame ? <span style={{ color: "var(--error)" }}>*</span> : "(opcional)"}
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={numberOnJersey}
            onChange={(e) => setNumberOnJersey(e.target.value)}
            placeholder={isGame ? "Sin repetir" : "Ej: 23"}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Observaciones (opcional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones adicionales…"
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading || !canSubmit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
          {loading ? "Creando…" : "Crear pedido"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-xl text-sm border"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
