"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
      style={{ background: "var(--accent)", color: "#000" }}
    >
      <Printer size={15} /> Imprimir / Guardar PDF
    </button>
  );
}
