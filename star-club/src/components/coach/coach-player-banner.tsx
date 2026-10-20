import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export function CoachPlayerBanner() {
  return (
    <div
      className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
      style={{
        background: "color-mix(in srgb, var(--accent) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--accent-lighter)" }}>
        <Zap size={14} style={{ color: "var(--accent-light)" }} />
        Modo Jugador activo
      </div>
      <Link
        href="/dashboard/coach"
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
        style={{
          background: "color-mix(in srgb, var(--accent) 18%, transparent)",
          color: "var(--accent-lighter)",
          border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
        }}
      >
        <ArrowLeft size={12} />
        Volver a Entrenador
      </Link>
    </div>
  );
}
