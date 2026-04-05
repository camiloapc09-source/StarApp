"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Upload, Check, Loader2, ChevronDown, ImageIcon } from "lucide-react";
import Image from "next/image";

const METHODS = [
  { value: "TRANSFER", label: "Transferencia / PSE" },
  { value: "NEQUI",    label: "Nequi" },
  { value: "CASH",     label: "Efectivo" },
  { value: "CARD",     label: "Tarjeta" },
  { value: "PSE",      label: "PSE" },
];

export default function PaymentSubmitForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("TRANSFER");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function uploadProof() {
    if (!file) return;
    setUploadingImg(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/payments/${paymentId}/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      setProofUrl(d.url);
    }
    setUploadingImg(false);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    // Upload proof image first if not yet uploaded
    if (file && !proofUrl) {
      await uploadProof();
    }

    const res = await fetch(`/api/payments/${paymentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: method, proofNote: note || undefined }),
    });

    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al enviar");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--success)" }}>
        <Check size={13} /> Pago reportado  el admin lo verificará pronto.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 w-full justify-center"
        style={{
          background: "rgba(0,255,135,0.07)",
          color: "var(--success)",
          borderColor: "rgba(0,255,135,0.2)",
        }}
      >
        <CreditCard size={13} /> Registrar este pago
      </button>
    );
  }

  const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <div className="space-y-3 pt-1">
      {/* Method selector */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Medio de pago
        </label>
        <div className="relative">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, appearance: "none", paddingRight: "2rem" }}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Proof image */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Comprobante (opcional)
        </label>
        {preview ? (
          <div className="flex items-center gap-3">
            <Image src={preview} alt="comprobante" width={56} height={56} className="rounded-lg object-cover" style={{ width: 56, height: 56, objectFit: "cover" }} />
            <button
              onClick={() => { setFile(null); setPreview(null); setProofUrl(null); }}
              className="text-xs underline"
              style={{ color: "var(--text-muted)" }}
            >
              Quitar
            </button>
          </div>
        ) : (
          <label className={`${inputCls} flex items-center gap-2 cursor-pointer`} style={inputStyle}>
            <ImageIcon size={13} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-muted)" }}>Adjuntar foto del recibo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Optional note */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Nota (opcional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Pagado el 3 de abril vía Nequi"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 flex-1 justify-center"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {submitting ? "Enviando..." : "Enviar pago"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-xl text-sm border"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
