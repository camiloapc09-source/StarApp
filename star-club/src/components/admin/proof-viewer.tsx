"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

export default function ProofViewer({ src }: { src: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 relative group"
        title="Ver comprobante"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Comprobante"
          className="w-20 h-20 object-cover rounded-lg border transition-opacity group-hover:opacity-70"
          style={{ borderColor: "var(--border-primary)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" style={{ background: "rgba(0,0,0,0.4)" }}>
          <ZoomIn size={20} color="#fff" />
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X size={20} color="#fff" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Comprobante"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
