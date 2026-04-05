"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Loader2 } from "lucide-react";

type Props = {
  player: {
    id: string;
    position: string | null;
    jerseyNumber: number | null;
    paymentDay: number | null;
    monthlyAmount: number | null;
    dateOfBirth: string | null;
    documentNumber: string | null;
    address: string | null;
    phone: string | null;
    categoryId: string | null;
    user: { name: string; email: string };
  };
  categories: { id: string; name: string }[];
};

export default function AdminEditPlayerButton({ player, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState({
    userName: player.user.name,
    categoryId: player.categoryId ?? "",
    position: player.position ?? "",
    jerseyNumber: player.jerseyNumber != null ? String(player.jerseyNumber) : "",
    paymentDay: player.paymentDay != null ? String(player.paymentDay) : "",
    monthlyAmount: player.monthlyAmount != null ? String(player.monthlyAmount) : "",
    dateOfBirth: player.dateOfBirth ? player.dateOfBirth.slice(0, 10) : "",
    documentNumber: player.documentNumber ?? "",
    address: player.address ?? "",
    phone: player.phone ?? "",
  });

  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      userName: data.userName,
      categoryId: data.categoryId || null,
      position: data.position || null,
      jerseyNumber: data.jerseyNumber !== "" ? parseInt(data.jerseyNumber) : null,
      paymentDay: data.paymentDay !== "" ? parseInt(data.paymentDay) : null,
      monthlyAmount: data.monthlyAmount !== "" ? parseFloat(data.monthlyAmount) : null,
      dateOfBirth: data.dateOfBirth || null,
      documentNumber: data.documentNumber || null,
      address: data.address || null,
      phone: data.phone || null,
    };

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
    }
    setSaving(false);
  }

  const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors focus:border-[var(--accent)]";
  const inputStyle = { background: "var(--bg-elevated)", borderColor: "var(--border-primary)", color: "var(--text-primary)" } as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
      >
        <Pencil size={13} /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5 my-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Editar deportista</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>NOMBRE COMPLETO</label>
                  <input value={data.userName} onChange={set("userName")} required className={inputCls} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>CATEGORIA</label>
                  <select value={data.categoryId} onChange={set("categoryId")} className={inputCls} style={inputStyle}>
                    <option value="">Sin categoria</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>POSICION</label>
                  <select value={data.position} onChange={set("position")} className={inputCls} style={inputStyle}>
                    <option value="">Sin posicion</option>
                    <option value="Base">Base (Point Guard)</option>
                    <option value="Escolta">Escolta (Shooting Guard)</option>
                    <option value="Alero">Alero (Small Forward)</option>
                    <option value="Ala-Pivot">Ala-Pivot (Power Forward)</option>
                    <option value="Pivot">Pivot (Center)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>DORSAL (#)</label>
                  <input type="number" min="0" max="99" value={data.jerseyNumber} onChange={set("jerseyNumber")} placeholder="0-99" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>DIA DE PAGO (1-28)</label>
                  <input type="number" min="1" max="28" value={data.paymentDay} onChange={set("paymentDay")} placeholder="Dia del mes" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>MONTO MENSUAL ($)</label>
                  <input type="number" min="0" step="1000" value={data.monthlyAmount} onChange={set("monthlyAmount")} placeholder="Ej: 80000" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>FECHA DE NACIMIENTO</label>
                  <input type="date" value={data.dateOfBirth} onChange={set("dateOfBirth")} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>DOCUMENTO</label>
                  <input value={data.documentNumber} onChange={set("documentNumber")} placeholder="CC / TI" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>TELEFONO</label>
                  <input value={data.phone} onChange={set("phone")} placeholder="+57..." className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>DIRECCION</label>
                  <input value={data.address} onChange={set("address")} placeholder="Calle, barrio..." className={inputCls} style={inputStyle} />
                </div>
              </div>

              {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:opacity-70" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: saved ? "var(--success)" : "var(--accent)", color: "#000" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
                  {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
