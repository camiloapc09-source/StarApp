"use client";

import { confirmDialog } from "@/components/ui/feedback";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Upload, X, Ticket } from "lucide-react";

interface Ticket {
  id: string;
  number: number;
  status: string;
  ownerName: string | null;
  takenById: string | null;
  proofUrl: string | null;
}

interface Props {
  raffleId: string;
  tickets: Ticket[];
  ticketPrice: number;
  clubLogo?: string | null;
  clubName: string;
  raffleName: string;
  prize?: string | null;
  drawDate?: string | null;
  currentUserId: string;
  /** Una rifa cerrada se ve, pero ya no admite tomar números. */
  raffleOpen: boolean;
}

export default function RafflePickForm({
  raffleId, tickets, ticketPrice, clubLogo, clubName, raffleName, prize, drawDate, currentUserId, raffleOpen,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<number[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const [uploadNum, setUploadNum] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const ticketMap = new Map(tickets.map((t) => [t.number, t]));
  const myTickets = tickets.filter((t) => t.takenById === currentUserId);

  function toggleNumber(n: number) {
    if (!raffleOpen) return;
    const t = ticketMap.get(n);
    if (t) return; // already taken
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  async function handleClaim() {
    if (selected.length === 0) return;
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: selected, ownerName: ownerName.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setClaimError(d.error ?? "Error al reservar los números");
        return;
      }
      setSelected([]);
      router.refresh();
    } catch {
      setClaimError("Error de red");
    } finally {
      setClaiming(false);
    }
  }

  async function handleUpload(number: number, file: File) {
    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets/${number}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        setUploadError(d.error ?? "Error al subir el comprobante");
        return;
      }
      setUploadNum(null);
      router.refresh();
    } catch {
      setUploadError("Error de red");
    } finally {
      setUploading(false);
    }
  }

  async function handleRelease(number: number) {
    if (!await confirmDialog(`¿Liberar el número ${String(number).padStart(2, "0")}?`)) return;
    const res = await fetch(`/api/rifas/${raffleId}/tickets/${number}/release`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Raffle card */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent) 0%, rgba(96,165,250,0.06) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          boxShadow: "0 0 40px color-mix(in srgb, var(--accent) 6%, transparent)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent) 0%, rgba(96,165,250,0.10) 100%)",
            borderBottom: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
          }}
        >
          {clubLogo ? (
            <img src={clubLogo} alt={clubName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
              style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent-lighter)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}>
              {clubName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm tracking-wide" style={{ color: "var(--accent-lighter)" }}>{raffleName}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{clubName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] font-bold" style={{ color: "var(--success)" }}>
              ${ticketPrice.toLocaleString("es-CO")}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>por número</p>
          </div>
        </div>

        {/* Prize */}
        {prize && (
          <div className="px-5 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
              <span className="font-semibold" style={{ color: "rgba(255,184,0,0.90)" }}>Premio: </span>
              {prize}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="p-4">
          <div className="grid gap-[5px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {Array.from({ length: 100 }, (_, i) => {
              const ticket = ticketMap.get(i);
              const isMine = ticket?.takenById === currentUserId;
              const isPaid = ticket?.status === "PAID";
              const isTaken = !!ticket && !isMine;
              const isSelected = selected.includes(i);
              const label = String(i).padStart(2, "0");

              let bg = "rgba(255,255,255,0.04)";
              let border = "rgba(255,255,255,0.07)";
              let color = "rgba(255,255,255,0.28)";
              let cursor = raffleOpen ? "pointer" : "default";

              if (isPaid && isMine) {
                bg = "rgba(0,255,135,0.18)"; border = "rgba(0,255,135,0.45)"; color = "rgba(0,255,135,0.95)";
              } else if (isMine) {
                bg = "color-mix(in srgb, var(--accent) 20%, transparent)"; border = "color-mix(in srgb, var(--accent) 50%, transparent)"; color = "var(--accent-lighter)";
              } else if (isTaken) {
                bg = "repeating-linear-gradient(45deg, rgba(255,184,0,0.07) 0px, rgba(255,184,0,0.07) 3px, rgba(255,184,0,0.02) 3px, rgba(255,184,0,0.02) 9px)";
                border = "rgba(255,184,0,0.22)"; color = "rgba(255,184,0,0.40)"; cursor = "not-allowed";
              } else if (isSelected) {
                bg = "color-mix(in srgb, var(--accent) 30%, transparent)"; border = "color-mix(in srgb, var(--accent) 60%, transparent)"; color = "var(--accent-lighter)";
              }

              return (
                <button
                  key={i}
                  onClick={() => !isTaken && toggleNumber(i)}
                  className="aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{ background: bg, border: `1px solid ${border}`, color, cursor }}
                  title={
                    isMine ? `Tuyo — ${isPaid ? "Pagado" : "Por cobrar"}` :
                    isTaken ? "Ocupado" :
                    raffleOpen ? label : "Rifa cerrada"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }} />
              Libre
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 60%, transparent)" }} />
              Seleccionado / Mío
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(0,255,135,0.18)", border: "1px solid rgba(0,255,135,0.45)" }} />
              Mío pagado
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{
                background: "repeating-linear-gradient(45deg, rgba(255,184,0,0.07) 0px, rgba(255,184,0,0.07) 3px, rgba(255,184,0,0.02) 3px, rgba(255,184,0,0.02) 9px)",
                border: "1px solid rgba(255,184,0,0.22)"
              }} />
              Reservado
            </span>
          </div>

          {!raffleOpen && (
            <p className="text-center text-[10px] mt-3" style={{ color: "var(--warning)" }}>
              Esta rifa está cerrada — ya no se pueden tomar números.
            </p>
          )}

          {drawDate && (
            <p className="text-center text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
              Sorteo: {new Date(drawDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Claim section */}
      {selected.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "var(--accent-lighter)" }}>
              {selected.length} número{selected.length > 1 ? "s" : ""} seleccionado{selected.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--success)" }}>
              ${(selected.length * ticketPrice).toLocaleString("es-CO")}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selected.sort((a, b) => a - b).map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg cursor-pointer"
                style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent-lighter)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}
                onClick={() => toggleNumber(n)}
              >
                {String(n).padStart(2, "0")} <X size={9} />
              </span>
            ))}
          </div>

          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Tu nombre (opcional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-primary)",
            }}
          />

          {claimError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,71,87,0.10)", color: "#ff4757" }}>
              {claimError}
            </p>
          )}

          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent-lighter)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}
          >
            {claiming ? "Reservando..." : `Reservar ${selected.length} número${selected.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* My tickets */}
      {myTickets.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ background: "color-mix(in srgb, var(--bg-primary) 60%, transparent)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Ticket size={14} />
            Mis números ({myTickets.length})
          </h3>

          <div className="space-y-2">
            {myTickets.sort((a, b) => a.number - b.number).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{
                    background: t.status === "PAID" ? "rgba(0,255,135,0.15)" : "color-mix(in srgb, var(--accent) 15%, transparent)",
                    color: t.status === "PAID" ? "var(--success)" : "var(--accent-lighter)",
                    border: `1px solid ${t.status === "PAID" ? "rgba(0,255,135,0.30)" : "color-mix(in srgb, var(--accent) 30%, transparent)"}`,
                  }}
                >
                  {String(t.number).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  {t.status === "PAID" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--success)" }}>
                      <CheckCircle2 size={11} /> Pagado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--warning)" }}>
                      <Clock size={11} /> Por cobrar — ${ticketPrice.toLocaleString("es-CO")}
                    </span>
                  )}
                  {t.proofUrl && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Comprobante enviado</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {t.status !== "PAID" && (
                    <>
                      <button
                        onClick={() => { setUploadNum(t.number); setUploadError(""); fileInputRef.current?.click(); }}
                        className="p-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                        style={{ background: "rgba(0,255,135,0.10)", color: "var(--success)", border: "1px solid rgba(0,255,135,0.20)" }}
                        title="Subir comprobante"
                      >
                        <Upload size={13} />
                      </button>
                      <button
                        onClick={() => handleRelease(t.number)}
                        className="p-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: "rgba(255,71,87,0.08)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.15)" }}
                        title="Liberar número"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {uploadError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,71,87,0.10)", color: "#ff4757" }}>
              {uploadError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && uploadNum !== null) await handleUpload(uploadNum, file);
              e.target.value = "";
            }}
          />

          {uploading && (
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Subiendo comprobante...</p>
          )}
        </div>
      )}
    </div>
  );
}
