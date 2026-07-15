"use client";

import { useRef, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface Props {
  paymentId: string;
  playerName: string;
  amount: number;
  concept: string;
  methodLabel: string;
  dateLabel: string;
  receiptNo: string;
  clubName: string;
  parentPhone: string | null;
}

const METHOD_ICON: Record<string, string> = {
  "Nequi": "💜",
  "Transferencia bancaria": "🏦",
  "Efectivo": "💵",
  "Tarjeta": "💳",
  "PSE": "🌐",
};

export default function ReceiptShareButton({
  playerName, amount, concept, methodLabel, dateLabel, receiptNo, clubName, parentPhone,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  async function shareAsImage() {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#0a0a1a",
        logging: false,
      });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png", 1));
      if (!blob) return;
      const file = new File([blob], `comprobante-${receiptNo}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Comprobante de pago" });
      } else {
        // Fallback: abrir WhatsApp con el teléfono si existe, o descargar la imagen
        if (parentPhone) {
          const digits = parentPhone.replace(/[^0-9]/g, "");
          const waPhone = `57${digits.replace(/^57/, "")}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          setTimeout(() => {
            window.open(`https://wa.me/${waPhone}`, "_blank");
          }, 800);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      setSharing(false);
    }
  }

  const methodIcon = METHOD_ICON[methodLabel] ?? "💳";

  return (
    <div className="space-y-3">
      {/* Comprobante capturado como imagen */}
      <div
        ref={receiptRef}
        style={{
          background: "linear-gradient(160deg, #0d0d2b 0%, #0a0a1a 60%, #0d1a2b 100%)",
          borderRadius: "20px",
          padding: "28px 24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          width: "100%",
        }}
      >
        {/* Club name */}
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px", textAlign: "center" }}>
          {clubName}
        </p>

        {/* Check */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(52,211,153,0.15)", border: "2px solid rgba(52,211,153,0.4)",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#34D399", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
          PAGO CONFIRMADO
        </p>

        <p style={{ textAlign: "center", color: "#ffffff", fontSize: "38px", fontWeight: 900, letterSpacing: "-1px", margin: "8px 0 4px" }}>
          ${amount.toLocaleString("es-CO")}
        </p>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "12px", marginBottom: "20px" }}>
          {playerName}
        </p>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "16px" }} />

        {/* Rows */}
        {[
          { label: "Concepto", value: concept },
          { label: "Método",   value: `${methodIcon} ${methodLabel}` },
          { label: "Fecha",    value: dateLabel },
          { label: "Ref.",     value: `#${receiptNo}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", fontWeight: 600 }}>{value}</span>
          </div>
        ))}

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "16px 0 12px" }} />

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: "10px" }}>
          Generado por StarApp
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={shareAsImage}
        disabled={sharing}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.30)" }}
      >
        {sharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
        {sharing ? "Generando imagen..." : "Compartir comprobante"}
      </button>
    </div>
  );
}
