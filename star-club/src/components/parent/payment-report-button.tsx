"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Banknote, CreditCard, Upload, ChevronRight, Clock, CheckCircle2, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  paymentId: string;
  concept: string;
  amount: number;
  dueDate: string; // ISO string
};

/** Confetti particle */
function Confetti() {
  const colors = ["#00ff87", "#FFB800", "#818cf8", "#ff4757", "#ffffff"];
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 8,
    duration: 0.9 + Math.random() * 0.8,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "40%", opacity: 1, scale: 1, rotate: 0 }}
          animate={{ y: "-10%", opacity: 0, scale: 0.5, rotate: Math.random() > 0.5 ? 180 : -180 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: p.color,
            top: "50%",
          }}
        />
      ))}
    </div>
  );
}

export default function PaymentReportButton({ paymentId, concept, amount, dueDate }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "NEQUI" | "">("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Period label from dueDate
  const due = new Date(dueDate);
  const periodStart = due;
  const periodEnd = new Date(due.getFullYear(), due.getMonth() + 1, due.getDate() - 1);
  const periodLabel = `${periodStart.toLocaleDateString("es-CO", { day: "numeric", month: "long" })} - ${periodEnd.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`;

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function resetModal() {
    setMethod("");
    setNote("");
    setFile(null);
    setLoading(false);
    setDone(false);
    setError(null);
  }

  function close() {
    setOpen(false);
    resetModal();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return setError("Selecciona el método de pago.");
    setLoading(true);
    setError(null);
    try {
      if (file && method === "TRANSFER") {
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch(`/api/payments/${paymentId}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          setError(data.error ?? "Error al subir imagen.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/payments/${paymentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method, proofNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al reportar pago.");
        setLoading(false);
        return;
      }

      setDone(true);
      // Auto-close and refresh after celebration
      setTimeout(() => {
        close();
        router.refresh();
      }, 4500);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  const methodOptions = [
    {
      id: "NEQUI",
      label: "Nequi",
      icon: <Smartphone size={22} />,
      sub: "Transferencia Nequi",
      activeStyle: { background: "rgba(130,0,255,0.12)", borderColor: "#8200ff", color: "#a855f7" },
    },
    {
      id: "TRANSFER",
      label: "Transferencia",
      icon: <CreditCard size={22} />,
      sub: "Consignación bancaria",
      activeStyle: { background: "rgba(99,102,241,0.12)", borderColor: "#818cf8", color: "#818cf8" },
    },
    {
      id: "CASH",
      label: "Efectivo",
      icon: <Banknote size={22} />,
      sub: "Pagas en mano",
      activeStyle: { background: "rgba(255,184,0,0.12)", borderColor: "var(--warning)", color: "var(--warning)" },
    },
  ] as const;

  const soonOptions = [
    { label: "Tarjeta", icon: "CARD", sub: "Próximamente" },
    { label: "PSE", icon: "BANK", sub: "Próximamente" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl font-semibold transition-all hover:opacity-80 mt-2"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        <span>Pagar mensualidad</span>
        <ChevronRight size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-md rounded-2xl overflow-hidden relative"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              {/* Celebration screen */}
              {done ? (
                <div className="relative flex flex-col items-center gap-4 py-12 px-8 text-center overflow-hidden">
                  <Confetti />

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                    className="relative"
                  >
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,255,135,0.15)", border: "3px solid var(--success)" }}
                    >
                      <CheckCircle2 size={52} style={{ color: "var(--success)" }} />
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <p className="text-2xl font-black tracking-tight">Pago registrado</p>
                    <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                      Período: <strong>{periodLabel}</strong>
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="w-full rounded-2xl p-4 mt-1"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>ESTADO DEL PROCESO</p>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--success)" }}>
                          <CheckCircle2 size={14} color="#000" />
                        </div>
                        <span className="text-[10px] font-medium text-center" style={{ color: "var(--success)" }}>Registrado</span>
                      </div>
                      <div className="flex-1 h-0.5 rounded" style={{ background: "rgba(255,184,0,0.5)" }} />
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,184,0,0.2)", border: "2px solid var(--warning)" }}>
                          <Clock size={13} style={{ color: "var(--warning)" }} />
                        </div>
                        <span className="text-[10px] font-medium text-center" style={{ color: "var(--warning)" }}>Verificación</span>
                      </div>
                      <div className="flex-1 h-0.5 rounded" style={{ background: "var(--border-primary)" }} />
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "2px solid var(--border-primary)" }}>
                          <CheckCircle2 size={13} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <span className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>Aprobado</span>
                      </div>
                    </div>
                    <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
                      El administrador revisará y aprobará tu pago. Recibirás una notificación cuando sea confirmado.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-base">Registrar pago</h2>
                      <p className="text-xs mt-1 font-medium" style={{ color: "var(--accent)" }}>
                        Período: {periodLabel}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {concept} · <strong>${amount.toLocaleString("es-CO")}</strong>
                      </p>
                    </div>
                    <button type="button" onClick={close} className="p-1 rounded-lg hover:opacity-70">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Method selector */}
                    <div>
                      <p className="text-xs font-semibold mb-2.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Método de pago
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {methodOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMethod(opt.id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all"
                            style={method === opt.id
                              ? opt.activeStyle
                              : { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                          >
                            {opt.icon}
                            <span className="text-xs font-semibold">{opt.label}</span>
                            <span className="text-[10px] text-center leading-tight" style={{ opacity: 0.7 }}>{opt.sub}</span>
                          </button>
                        ))}
                      </div>
                      {/* Coming soon */}
                      <div className="grid grid-cols-2 gap-2">
                        {soonOptions.map((opt) => (
                          <div
                            key={opt.label}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border opacity-40 cursor-not-allowed"
                            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                          >
                            <span>{opt.icon}</span>
                            <div>
                              <span className="text-xs font-medium">{opt.label}</span>
                              <span className="text-[10px] ml-1 px-1 py-0.5 rounded-full" style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)" }}>
                                {opt.sub}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transfer: comprobante upload */}
                    {(method === "TRANSFER" || method === "NEQUI") && (
                      <div>
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          Comprobante (opcional)
                        </p>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all hover:opacity-80"
                          style={file
                            ? { borderColor: "var(--success)", background: "rgba(0,255,135,0.05)" }
                            : { borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                        >
                          <Upload size={16} style={{ color: file ? "var(--success)" : "var(--text-muted)" }} />
                          <span className="text-sm" style={{ color: file ? "var(--success)" : "var(--text-muted)" }}>
                            {file ? `OK ${file.name}` : "Adjuntar captura de pantalla"}
                          </span>
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    )}

                    {/* Cash info */}
                    {method === "CASH" && (
                      <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,184,0,0.06)", borderLeft: "3px solid var(--warning)" }}>
                        El administrador registrará el pago cuando reciba el efectivo. Puedes dejar un mensaje.
                      </div>
                    )}

                    {/* Note */}
                    {method && (
                      <div>
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          {method === "CASH" ? "Mensaje (opcional)" : "Referencia / nota (opcional)"}
                        </p>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={400}
                          rows={2}
                          placeholder={method === "CASH" ? "Ej: Pagaré en la sesión del martes..." : "Ej: Transferencia Nequi del 01/04, tel 300..."}
                          className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none border"
                          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                        />
                      </div>
                    )}

                    {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

                    <button
                      type="submit"
                      disabled={loading || !method}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      {loading ? "Registrando..." : "Registrar pago ->"}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
