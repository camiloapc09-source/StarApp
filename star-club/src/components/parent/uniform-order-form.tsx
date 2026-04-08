"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, Check, ChevronDown, Info } from "lucide-react";

const SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

export default function UniformOrderForm({
  type,
  unitPrice,
  playerLastName,
}: {
  type: string;
  unitPrice: number;
  playerLastName: string;
}) {
  const router = useRouter();
  const [open, setOpen]                   = useState(false);
  const [jerseySize, setJerseySize]       = useState("M");
  const [shortsSize, setShortsSize]       = useState("M");
  const [nameOnJersey, setNameOnJersey]   = useState(type === "GAME" ? playerLastName : "");
  const [numberOnJersey, setNumberOnJersey] = useState("");
  const [notes, setNotes]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [done, setDone]                   = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const isGame = type === "GAME";

  async function submit() {
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
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
      const d = await res.json();
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

  const inputCls   = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  const SizeSelect = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={{ ...inputStyle, appearance: "none", paddingRight: "2rem" }}
        >
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );

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

      <div className="grid grid-cols-2 gap-3">
        <SizeSelect label="Talla camiseta" value={jerseySize} onChange={setJerseySize} />
        <SizeSelect label="Talla pantaloneta" value={shortsSize} onChange={setShortsSize} />

        {/* Name on jersey */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Nombre en camiseta
          </label>
          <input
            type="text"
            value={nameOnJersey}
            onChange={(e) => setNameOnJersey(e.target.value)}
            readOnly={isGame}
            placeholder={isGame ? playerLastName : "Nombre o apodo..."}
            className={inputCls}
            style={isGame ? { ...inputStyle, opacity: 0.7 } : inputStyle}
          />
          {isGame && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Solo el apellido del deportista
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
          disabled={loading || !nameOnJersey.trim() || (isGame && !numberOnJersey)}
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
