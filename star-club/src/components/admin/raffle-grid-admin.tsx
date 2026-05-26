"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Eye, EyeOff, Upload, Search, UserPlus, X } from "lucide-react";

interface Ticket {
  id: string;
  number: number;
  status: string;
  ownerName: string | null;
  takenById: string | null;
  takenAt: string;
  paidAt: string | null;
  proofUrl: string | null;
  takenBy: { name: string; id: string } | null;
}

interface ParentSummary {
  id: string;       // User ID
  name: string;     // Parent name
  children: string[]; // Children names
}

interface Props {
  raffleId: string;
  tickets: Ticket[];
  clubLogo?: string | null;
  clubName: string;
  raffleName: string;
  prize?: string | null;
  ticketPrice: number;
  drawDate?: string | null;
  parents: ParentSummary[];
  raffleOpen: boolean;
}

export default function RaffleGridAdmin({
  raffleId, tickets, clubLogo, clubName, raffleName, prize, ticketPrice, drawDate, parents, raffleOpen,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [proofVisible, setProofVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Assign panel state
  const [assigningNumber, setAssigningNumber] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const ticketMap = new Map(tickets.map((t) => [t.number, t]));

  // Filter parents by search query (matches parent name OR any child name)
  const filteredParents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.children.some((c) => c.toLowerCase().includes(q))
    );
  }, [parents, searchQuery]);

  async function handleVerify(number: number) {
    setVerifying(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets/${number}/verify`, { method: "POST" });
      if (res.ok) { setSelected(null); router.refresh(); }
    } finally { setVerifying(false); }
  }

  async function handleUnverify(number: number) {
    setVerifying(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets/${number}/verify`, { method: "DELETE" });
      if (res.ok) { setSelected(null); router.refresh(); }
    } finally { setVerifying(false); }
  }

  async function handleRelease(number: number) {
    if (!confirm(`¿Liberar el número ${String(number).padStart(2, "0")}?`)) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets/${number}/release`, { method: "DELETE" });
      if (res.ok) { setSelected(null); router.refresh(); }
    } finally { setReleasing(false); }
  }

  async function handleAssign(parentId: string, parentName: string) {
    if (assigningNumber === null) return;
    setAssigning(true);
    setAssignError("");
    try {
      const res = await fetch(`/api/rifas/${raffleId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: [assigningNumber],
          ownerName: parentName,
          assignToUserId: parentId,
        }),
      });
      if (res.ok) {
        setAssigningNumber(null);
        setSearchQuery("");
        router.refresh();
      } else {
        const d = await res.json();
        setAssignError(d.error ?? "Error al asignar");
      }
    } catch {
      setAssignError("Error de red");
    } finally {
      setAssigning(false);
    }
  }

  const totalTaken = tickets.length;
  const totalPaid = tickets.filter((t) => t.status === "PAID").length;
  const totalPending = tickets.filter((t) => t.status === "TAKEN").length;

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl py-3 px-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xl font-bold">{totalTaken}</p>
          <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>Tomados</p>
        </div>
        <div className="rounded-xl py-3 px-2" style={{ background: "rgba(0,255,135,0.06)", border: "1px solid rgba(0,255,135,0.15)" }}>
          <p className="text-xl font-bold" style={{ color: "var(--success)" }}>{totalPaid}</p>
          <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>Pagados</p>
        </div>
        <div className="rounded-xl py-3 px-2" style={{ background: "rgba(255,184,0,0.06)", border: "1px solid rgba(255,184,0,0.15)" }}>
          <p className="text-xl font-bold" style={{ color: "var(--warning)" }}>{totalPending}</p>
          <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>Por cobrar</p>
        </div>
      </div>

      {/* Raffle card */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(96,165,250,0.08) 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "0 0 40px rgba(139,92,246,0.08)",
        }}
      >
        {/* Card header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.20) 0%, rgba(96,165,250,0.12) 100%)",
            borderBottom: "1px solid rgba(139,92,246,0.20)",
          }}
        >
          {clubLogo ? (
            <img src={clubLogo} alt={clubName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.25)", color: "#DEC4FF", border: "1px solid rgba(139,92,246,0.40)" }}>
              {clubName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm tracking-wide" style={{ color: "#DEC4FF" }}>{raffleName}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{clubName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] font-bold" style={{ color: "var(--success)" }}>
              ${ticketPrice.toLocaleString("es-CO")}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>por número</p>
          </div>
        </div>

        {/* Prize info */}
        {prize && (
          <div className="px-5 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              <span className="font-semibold" style={{ color: "rgba(255,184,0,0.90)" }}>Premio: </span>
              {prize}
            </p>
          </div>
        )}

        {/* Number grid */}
        <div className="p-4">
          {raffleOpen && (
            <p className="text-[10px] mb-3 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
              Toca un número libre para asignarlo a un padre
            </p>
          )}
          <div className="grid gap-[5px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {Array.from({ length: 100 }, (_, i) => {
              const ticket = ticketMap.get(i);
              const isPaid = ticket?.status === "PAID";
              const isTaken = !!ticket && !isPaid;
              const isFree = !ticket;
              const isBeingAssigned = assigningNumber === i;
              const label = String(i).padStart(2, "0");

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (ticket) {
                      setAssigningNumber(null);
                      setSelected(ticket);
                    } else if (raffleOpen) {
                      setSelected(null);
                      setAssigningNumber(isBeingAssigned ? null : i);
                      setSearchQuery("");
                      setAssignError("");
                    }
                  }}
                  className="aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: isBeingAssigned
                      ? "rgba(139,92,246,0.30)"
                      : isPaid
                      ? "rgba(0,255,135,0.15)"
                      : isTaken
                      ? "rgba(255,184,0,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: isBeingAssigned
                      ? "1px solid rgba(139,92,246,0.70)"
                      : isPaid
                      ? "1px solid rgba(0,255,135,0.35)"
                      : isTaken
                      ? "1px solid rgba(255,184,0,0.30)"
                      : "1px solid rgba(255,255,255,0.07)",
                    color: isBeingAssigned
                      ? "#DEC4FF"
                      : isPaid
                      ? "rgba(0,255,135,0.90)"
                      : isTaken
                      ? "rgba(255,184,0,0.90)"
                      : "rgba(255,255,255,0.28)",
                    cursor: (ticket || raffleOpen) ? "pointer" : "default",
                    boxShadow: isBeingAssigned ? "0 0 8px rgba(139,92,246,0.40)" : "none",
                  }}
                  title={
                    ticket
                      ? `${label} — ${ticket.ownerName ?? "?"} (${isPaid ? "Pagado" : "Por cobrar"})`
                      : raffleOpen
                      ? `Asignar número ${label}`
                      : label
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              Libre
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(255,184,0,0.15)", border: "1px solid rgba(255,184,0,0.35)" }} />
              Por cobrar
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(0,255,135,0.15)", border: "1px solid rgba(0,255,135,0.35)" }} />
              Pagado
            </span>
            {raffleOpen && (
              <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(139,92,246,0.30)", border: "1px solid rgba(139,92,246,0.70)" }} />
                Seleccionado
              </span>
            )}
          </div>

          {drawDate && (
            <p className="text-center text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
              Sorteo: {new Date(drawDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Assign panel — shown when a free number is selected */}
      {assigningNumber !== null && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: "rgba(8,6,28,0.95)", borderColor: "rgba(139,92,246,0.30)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.20)", color: "#DEC4FF", border: "1px solid rgba(139,92,246,0.40)" }}
              >
                {String(assigningNumber).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: "#DEC4FF" }}>
                  Asignar número {String(assigningNumber).padStart(2, "0")}
                </p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Busca por nombre del padre o del deportista
                </p>
              </div>
            </div>
            <button
              onClick={() => { setAssigningNumber(null); setSearchQuery(""); setAssignError(""); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }} />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre del padre o del deportista..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(139,92,246,0.25)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Results list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filteredParents.length === 0 ? (
              <p className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
                No se encontraron padres con ese nombre
              </p>
            ) : (
              filteredParents.map((parent) => (
                <button
                  key={parent.id}
                  onClick={() => handleAssign(parent.id, parent.name)}
                  disabled={assigning}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {parent.name}
                  </p>
                  {parent.children.length > 0 && (
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                      {parent.children.join(" · ")}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {assignError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,71,87,0.10)", color: "#ff4757" }}>
              {assignError}
            </p>
          )}
        </div>
      )}

      {/* Ticket detail panel */}
      {selected && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: "rgba(8,6,28,0.95)", borderColor: "rgba(139,92,246,0.25)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-lg" style={{ color: "#DEC4FF" }}>
                Número {String(selected.number).padStart(2, "0")}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {selected.ownerName ?? selected.takenBy?.name ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selected.status === "PAID" ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(0,255,135,0.12)", color: "var(--success)", border: "1px solid rgba(0,255,135,0.25)" }}>
                  <CheckCircle2 size={12} /> Pagado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,184,0,0.10)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.25)" }}>
                  <Clock size={12} /> Por cobrar
                </span>
              )}
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>

          {selected.proofUrl && (
            <div>
              <button
                onClick={() => setProofVisible(!proofVisible)}
                className="flex items-center gap-2 text-xs font-semibold mb-2 transition-opacity hover:opacity-70"
                style={{ color: "var(--text-secondary)" }}
              >
                {proofVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                {proofVisible ? "Ocultar comprobante" : "Ver comprobante"}
              </button>
              {proofVisible && (
                <img
                  src={selected.proofUrl}
                  alt="Comprobante de pago"
                  className="rounded-xl max-h-64 w-full object-contain"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                />
              )}
            </div>
          )}

          {!selected.proofUrl && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Upload size={12} /> Sin comprobante subido
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {selected.status === "TAKEN" && (
              <button
                onClick={() => handleVerify(selected.number)}
                disabled={verifying}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "rgba(0,255,135,0.15)", color: "var(--success)", border: "1px solid rgba(0,255,135,0.25)" }}
              >
                {verifying ? "Verificando..." : "✓ Marcar pagado"}
              </button>
            )}
            {selected.status === "PAID" && (
              <button
                onClick={() => handleUnverify(selected.number)}
                disabled={verifying}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "rgba(255,184,0,0.08)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.20)" }}
              >
                {verifying ? "..." : "Revertir a pendiente"}
              </button>
            )}
            {selected.status === "TAKEN" && (
              <button
                onClick={() => handleRelease(selected.number)}
                disabled={releasing}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "rgba(255,71,87,0.08)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.20)" }}
              >
                {releasing ? "..." : "Liberar"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
