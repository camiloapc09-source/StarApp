import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export function CoachPlayerBanner() {
  return (
    <div
      className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
      style={{
        background: "rgba(139,92,246,0.10)",
        border: "1px solid rgba(139,92,246,0.25)",
      }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#DEC4FF" }}>
        <Zap size={14} style={{ color: "#A78BFA" }} />
        Modo Jugador activo
      </div>
      <Link
        href="/dashboard/coach"
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
        style={{
          background: "rgba(139,92,246,0.18)",
          color: "#DEC4FF",
          border: "1px solid rgba(139,92,246,0.35)",
        }}
      >
        <ArrowLeft size={12} />
        Volver a Entrenador
      </Link>
    </div>
  );
}
