"use client";

import { confirmDialog, toast } from "@/components/ui/feedback";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Banknote, X, Trash2, CalendarClock } from "lucide-react";

export function PaymentConfirmButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function confirm() {
    setLoading(true);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      router.push(`/dashboard/admin/payments/batch-receipt?ids=${paymentId}`);
    } else {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(0,255,135,0.15)", color: "var(--success)", border: "1px solid rgba(0,255,135,0.3)" }}
    >
      <Check size={13} /> {loading ? "Confirmando..." : "Confirmar y recibo"}
    </button>
  );
}

export function PaymentCashButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function registerCash() {
    setLoading(true);
    await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: "CASH" }),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={registerCash}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(255,184,0,0.12)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.3)" }}
    >
      <Banknote size={13} /> {loading ? "Registrando..." : "Efectivo recibido"}
    </button>
  );
}

export function PaymentRejectButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function reject() {
    if (!await confirmDialog("¿Rechazar este comprobante y devolver el pago a Pendiente?")) return;
    setLoading(true);
    await fetch(`/api/payments/${paymentId}/reject`, { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={reject}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(255,71,87,0.1)", color: "var(--error)", border: "1px solid rgba(255,71,87,0.25)" }}
    >
      <X size={13} /> {loading ? "..." : "Rechazar"}
    </button>
  );
}

export function PaymentDeleteButton({ paymentId, playerName }: { paymentId: string; playerName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function deletePayment() {
    if (!await confirmDialog(`¿Eliminar este registro de pago de ${playerName}? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      toast.error("Error al eliminar el pago.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deletePayment}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={{ background: "rgba(255,71,87,0.06)", color: "var(--error)", border: "1px solid rgba(255,71,87,0.2)" }}
    >
      <Trash2 size={13} /> {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

/**
 * Promesa de pago: el acudiente dijo "te pago el viernes". Se guarda la fecha y
 * el sistema le recuerda UNA vez ese día, solo si el cobro sigue abierto.
 */
export function PaymentPromiseButton({
  paymentId,
  promisedDate,
}: {
  paymentId: string;
  /** "YYYY-MM-DD" de la promesa actual, si existe. */
  promisedDate?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(promisedDate ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    if (!date) return;
    setLoading(true);
    const res = await fetch(`/api/payments/${paymentId}/promise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setLoading(false);
    if (res.ok) {
      toast("Promesa guardada. Se le recuerda ese día.");
      setOpen(false);
      router.refresh();
    } else {
      toast("No se pudo guardar la promesa");
    }
  }

  async function clear() {
    setLoading(true);
    await fetch(`/api/payments/${paymentId}/promise`, { method: "DELETE" });
    setLoading(false);
    setOpen(false);
    setDate("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="El acudiente prometió pagar en una fecha"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.28)" }}
      >
        <CalendarClock size={12} /> {promisedDate ? "Cambiar promesa" : "Promesa"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-2 py-1 rounded-lg text-xs"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "inherit" }}
      />
      <button
        type="button"
        onClick={save}
        disabled={!date || loading}
        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.35)" }}
      >
        {loading ? "..." : "Guardar"}
      </button>
      {promisedDate && (
        <button
          type="button"
          onClick={clear}
          disabled={loading}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
          style={{ background: "rgba(255,71,87,0.10)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.22)" }}
        >
          Quitar
        </button>
      )}
      <button type="button" onClick={() => setOpen(false)} className="p-1 opacity-60 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
}
