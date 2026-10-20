"use client";

import { useEffect, useState } from "react";
import { Palette, Wand2, Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/feedback";
import { onColor } from "@/lib/club-theme";

type Colors = { primary?: string; secondary?: string; background?: string };

type Props = {
  logo: string | null;
  primary: string;
  secondary: string;
  background: string;
  onChange: (c: Colors) => void;
};

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

function luminance([r, g, b]: [number, number, number]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Saca los colores dominantes del logo: agrupa los píxeles con color (ignora
 * negros, blancos y grises) y devuelve los grupos más grandes con tonos
 * distintos. El más usado es el principal; el siguiente, el secundario.
 */
async function extractFromLogo(src: string): Promise<Colors> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  let darkR = 0, darkG = 0, darkB = 0, darkN = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 70) { darkR += r; darkG += g; darkB += b; darkN++; continue; }
    if (max - min < 40) continue; // grises y blancos
    const key = [r, g, b].map((v) => Math.round(v / 32)).join(",");
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bk.n++; bk.r += r; bk.g += g; bk.b += b;
    buckets.set(key, bk);
  }

  const sorted = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((bk) => [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n] as [number, number, number]);

  const hue = ([r, g, b]: [number, number, number]) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min || 1;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };

  // Principal: el color más usado que se vea sobre fondo oscuro.
  let primary = sorted.find((c) => luminance(c) > 0.25) ?? sorted[0];
  if (!primary) return {};
  // Si es muy oscuro (ej. morado profundo), se aclara para que sirva de botón.
  if (luminance(primary) < 0.25) primary = primary.map((v) => v + (255 - v) * 0.35) as typeof primary;
  const secondary = sorted.find((c) => {
    const dh = Math.abs(hue(c) - hue(primary!));
    return Math.min(dh, 360 - dh) > 40;
  });

  // Fondo: el oscuro del logo si lo tiene; si no, un casi negro del tono principal.
  const bg: [number, number, number] = darkN > size * size * 0.15
    ? [darkR / darkN, darkG / darkN, darkB / darkN].map((v) => Math.min(v, 22)) as [number, number, number]
    : primary.map((v) => 6 + v * 0.04) as [number, number, number];

  return {
    primary: toHex(...primary),
    secondary: secondary ? toHex(...secondary) : undefined,
    background: toHex(...bg),
  };
}

export default function BrandColorsCard({ logo, primary, secondary, background, onChange }: Props) {
  const [extracting, setExtracting] = useState(false);

  // Vista previa en vivo: la app entera cambia mientras se elige. Al salir de
  // la pantalla se quita, y queda lo guardado (que viene del servidor).
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--brand", primary);
    root.setProperty("--brand-2", secondary);
    root.setProperty("--brand-bg", background);
    root.setProperty("--on-accent", onColor(primary));
  }, [primary, secondary, background]);

  useEffect(() => () => {
    const root = document.documentElement.style;
    ["--brand", "--brand-2", "--brand-bg", "--on-accent"].forEach((v) => root.removeProperty(v));
  }, []);

  async function fromLogo() {
    if (!logo) {
      toast.info("Primero sube el logo del club.");
      return;
    }
    setExtracting(true);
    try {
      const c = await extractFromLogo(logo);
      if (!c.primary) throw new Error("sin color");
      onChange(c);
      toast.success("Colores tomados del logo. Revisa la vista previa y guarda.");
    } catch {
      toast.error("No se pudieron leer los colores del logo. Elígelos a mano.");
    } finally {
      setExtracting(false);
    }
  }

  const fields: { key: keyof Colors; label: string; hint: string; value: string }[] = [
    { key: "primary", label: "Principal", hint: "Botones y acentos", value: primary },
    { key: "secondary", label: "Secundario", hint: "Destacados y rachas", value: secondary },
    { key: "background", label: "Fondo", hint: "Color base, oscuro", value: background },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-glow)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
            <Palette size={15} style={{ color: "var(--accent-light)" }} />
          </div>
          <div>
            <h2 className="font-bold text-[15px]">Colores del club</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Toda la app se pinta con estos colores</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fromLogo}
          disabled={extracting}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--accent-glow)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent-lighter)" }}
        >
          {extracting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Sacar colores del logo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {fields.map((f) => (
          <label key={f.key}
            className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)" }}>
            <span className="relative w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden"
              style={{ background: f.value, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>
              <input
                type="color"
                value={f.value}
                onChange={(e) => onChange({ [f.key]: e.target.value.toUpperCase() })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label={`Color ${f.label.toLowerCase()}`}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{f.label}</span>
              <span className="block text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{f.value} · {f.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Muestra */}
      <div className="mt-4 p-4 rounded-2xl flex items-center gap-3 flex-wrap"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase mr-1" style={{ color: "var(--text-muted)" }}>Vista previa</span>
        <span className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
          <Check size={14} /> Botón
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: "color-mix(in srgb, var(--accent-2) 18%, transparent)", color: "var(--accent-2)" }}>
          🔥 Racha 5
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "var(--accent-glow)", color: "var(--accent-lighter)" }}>
          Etiqueta
        </span>
        <span className="flex-1 min-w-[120px] h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <span className="block h-full w-2/3 rounded-full" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
        </span>
      </div>
      <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
        Los cambios se ven ya en esta pantalla. Presiona <strong>Guardar</strong> para aplicarlos a todo el club.
      </p>
    </Card>
  );
}
