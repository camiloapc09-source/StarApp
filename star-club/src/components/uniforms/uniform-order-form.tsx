"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, Check, ChevronDown, Info } from "lucide-react";

const SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

export type OrderablePlayer = { id: string; name: string; surnames: string[] };

const inputCls   = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

/** Se declara fuera del render: si no, React lo remonta y el select pierde foco. */
function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={{ ...inputStyle, appearance: "none", paddingRight: "2rem" }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

const SIZE_OPTIONS = SIZES.map((s) => ({ value: s, label: s }));

export default function UniformOrderForm({
  type,
  unitPrice,
  players,
}: {
  type: string;
  unitPrice: number;
  /** Deportistas para los que se puede pedir. Un acudiente puede tener varios. */
  players: OrderablePlayer[];
}) {
  const router = useRouter();
  const [open, setOpen]                     = useState(false);
  const [playerId, setPlayerId]             = useState(players[0]?.id ?? "");
  const [jerseySize, setJerseySize]         = useState("M");
  const [shortsSize, setShortsSize]         = useState("M");
  const [nameOnJersey, setNameOnJersey]     = useState("");
  const [numberOnJersey, setNumberOnJersey] = useState("");
  const [notes, setNotes]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const isGame       = type === "GAME";
  const multiPlayer  = players.length > 1;
  const selected     = players.find((p) => p.id === playerId) ?? players[0];

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

    if (numberOnJersey !== "") {
      payload.numberOnJersey = parseInt(numberOnJersey, 10);
    }

    const res = await fetch("/api/uniforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al enviar pedido");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--success)" }}>
        <Check size={13} /> Pedido enviado — el admin lo confirmará pronto.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
      >
        <ShoppingCart size={13} /> Solicitar
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Game uniform info box */}
      {isGame && (
        <div
          className="flex items-start gap-2 rounded-xl p-3 text-xs"
          style={{ background: "rgba(99,179,237,0.08)", color: "var(--text-secondary)" }}
        >
          <Info size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#63b3ed" }} />
          <span>El nombre en la camiseta debe ser el <strong>apellido</strong> del deportista. El número debe ser único (no repetido).</span>
        </div>
      )}

      {/* Player picker — solo si hay más de un deportista vinculado */}
      {multiPlayer && (
        <SelectField
          label="Deportista"
          value={playerId}
          onChange={setPlayerId}
          options={players.map((p) => ({ value: p.id, label: p.name }))}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Talla camiseta" value={jerseySize} onChange={setJerseySize} options={SIZE_OPTIONS} />
        <SelectField label="Talla pantaloneta" value={shortsSize} onChange={setShortsSize} options={SIZE_OPTIONS} />

        {/* Name on jersey */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Nombre en camiseta
          </label>
          <input
            type="text"
            value={nameOnJersey}
            onChange={(e) => setNameOnJersey(e.target.value)}
            placeholder={isGame ? "Escribe el primer apellido..." : "Nombre o apodo..."}
            className={inputCls}
            style={inputStyle}
          />
          {isGame && (selected?.surnames.length ?? 0) > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Apellidos detectados: {selected!.surnames.join(", ")} — escribe el primer apellido
            </p>
          )}
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
          {isGame && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              No puede estar en uso por otro pedido
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Observaciones (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: largo especial, indicaciones adicionales..."
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
          ${unitPrice.toLocaleString("es-CO")}
        </span>
        <button
          onClick={submit}
          disabled={loading || !playerId || !nameOnJersey.trim() || (isGame && !numberOnJersey)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
          {loading ? "Enviando..." : "Confirmar pedido"}
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
