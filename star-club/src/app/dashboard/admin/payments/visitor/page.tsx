"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Share2, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  NEQUI:    "Nequi",
  CARD:     "Tarjeta",
};

export default function VisitorPaymentPage() {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [name, setName]         = useState("");
  const [amount, setAmount]     = useState("");
  const [concept, setConcept]   = useState("Cuota de entrenamiento");
  const [method, setMethod]     = useState("CASH");
  const [showReceipt, setShowReceipt] = useState(false);
  const [sharing, setSharing]   = useState(false);

  const refNo = useRef<string>(Math.random().toString(36).slice(2, 10).toUpperCase());
  const today = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  function generate() {
    if (!name.trim() || !amount || parseInt(amount) <= 0) return;
    setShowReceipt(true);
  }

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
      const file = new File([blob], `comprobante-visitante-${refNo.current}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Comprobante de pago" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  }

  const amountNum = parseInt(amount) || 0;

  const inputCls   = "w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="p-4 md:p-8 max-w-lg mx-auto">

        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/admin/payments"
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={16} /> Volver
          </Link>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <UserPlus size={16} style={{ color: "var(--accent)" }} />
            Pago de visitante
          </h1>
        </div>

        {!showReceipt ? (
          <Card>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Genera un comprobante para un padre o jugador que aún no está registrado en la plataforma.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  Nombre completo <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez López"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  Monto <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 80000"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  Concepto
                </label>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Cuota de entrenamiento"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  Método de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(METHOD_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMethod(val)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold border transition-colors"
                      style={{
                        background: method === val ? "var(--accent)" : "var(--bg-elevated)",
                        color: method === val ? "#000" : "var(--text-primary)",
                        borderColor: method === val ? "var(--accent)" : "var(--border-primary)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generate}
                disabled={!name.trim() || amountNum <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Generar comprobante
              </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Receipt card — captured by html2canvas */}
            <div
              ref={receiptRef}
              style={{
                background: "linear-gradient(160deg, #0d0d2b 0%, #0a0a1a 60%, #0d1a2b 100%)",
                borderRadius: "20px",
                padding: "28px 24px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {/* Club label */}
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px", textAlign: "center" }}>
                Comprobante de pago
              </p>

              {/* Check icon */}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "60px", height: "60px", borderRadius: "50%",
                  background: "rgba(52,211,153,0.15)", border: "2px solid rgba(52,211,153,0.4)",
                }}>
                  <span style={{ color: "#34D399", fontSize: "28px" }}>✓</span>
                </div>
              </div>

              <p style={{ textAlign: "center", color: "#34D399", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
                PAGO RECIBIDO
              </p>

              {/* Amount */}
              <p style={{ textAlign: "center", color: "#ffffff", fontSize: "36px", fontWeight: 900, letterSpacing: "-1px", margin: "8px 0 20px" }}>
                ${amountNum.toLocaleString("es-CO")}
              </p>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "16px" }} />

              {/* Details */}
              {[
                { label: "Nombre",   value: name.trim() },
                { label: "Concepto", value: concept || "—" },
                { label: "Método",   value: METHOD_LABELS[method] ?? method },
                { label: "Fecha",    value: today },
                { label: "Ref",      value: refNo.current },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "12px" }}>{label}</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value}</span>
                </div>
              ))}

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "16px 0 12px" }} />

              {/* Footer */}
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>
                Visitante · No registrado en plataforma
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={shareAsImage}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}
              >
                {sharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                {sharing ? "Generando..." : "Compartir imagen"}
              </button>
              <button
                onClick={() => { setShowReceipt(false); }}
                className="px-4 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
              >
                Nuevo
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Este comprobante no queda guardado en la plataforma.
              <br />Si este visitante se registra después, agrega su pago desde el perfil del jugador.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
