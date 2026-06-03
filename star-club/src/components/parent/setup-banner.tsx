"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function SetupBanner() {
  return (
    <div
      className="mx-4 mt-3 rounded-2xl px-4 py-3.5 flex items-center gap-3"
      style={{
        background: "rgba(234,179,8,0.07)",
        border: "1px solid rgba(234,179,8,0.22)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(234,179,8,0.12)" }}
      >
        <ShieldCheck size={18} style={{ color: "#FBBF24" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "#FBBF24" }}>
          Configura tu cuenta
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          Elige tu contraseña y vincula a tus hijos para personalizar tu acceso.
        </p>
      </div>
      <Link
        href="/dashboard/parent/setup"
        className="flex items-center gap-1 text-xs font-bold flex-shrink-0 px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
        style={{ background: "rgba(234,179,8,0.14)", color: "#FBBF24" }}
      >
        Ir <ArrowRight size={13} />
      </Link>
    </div>
  );
}
