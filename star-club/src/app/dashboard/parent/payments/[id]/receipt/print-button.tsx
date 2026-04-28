"use client";

import { useState } from "react";
import html2canvas from "html2canvas";
import { MessageCircle, Printer } from "lucide-react";

interface Props {
  receiptNo: string;
}

export default function ShareReceiptButton({ receiptNo }: Props) {
  const [loading, setLoading] = useState(false);

  async function shareAsImage() {
    setLoading(true);
    try {
      const el = document.getElementById("receipt");
      if (!el) { setLoading(false); return; }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0a0a1a",
        logging: false,
      });

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("toBlob failed"));
        }, "image/png", 1);
      });

      const filename = `comprobante-${receiptNo}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Comprobante de pago #${receiptNo}` });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      window.print();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={shareAsImage}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.30)" }}
      >
        <MessageCircle size={15} />
        {loading ? "Preparando..." : "Compartir por WhatsApp"}
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-70"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
        title="Imprimir / Guardar PDF"
      >
        <Printer size={14} />
      </button>
    </div>
  );
}
