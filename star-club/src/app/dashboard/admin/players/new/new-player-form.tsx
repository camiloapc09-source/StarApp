"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { getClientDictionary } from "@/lib/client-dict";

interface NewPlayerFormProps {
  categories: { id: string; name: string }[];
  zonePrices: Record<string, number> | null;
}

const ZONES = ["SUR", "CENTRO", "NORTE"] as const;

export function NewPlayerForm({ categories, zonePrices }: NewPlayerFormProps) {
  const dict = getClientDictionary();
  const router = useRouter();
  const hasZones = !!zonePrices && Object.keys(zonePrices).length > 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parentCredentials, setParentCredentials] = useState<{ password: string; email: string; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    categoryId: "",
    zone: "",
    dateOfBirth: "",
    documentNumber: "",
    address: "",
    phone: "",
    joinDate: "",
    monthlyFee: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    parentRelation: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-fill monthly fee when zone changes and club has zone prices
      if (field === "zone" && zonePrices && value) {
        next.monthlyFee = String(zonePrices[value] ?? "");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
      categoryId: form.categoryId || undefined,
      zone: form.zone || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      documentNumber: form.documentNumber || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      joinDate: form.joinDate || undefined,
      monthlyFee: form.monthlyFee ? parseFloat(form.monthlyFee) : undefined,
      parentName: form.parentName || undefined,
      parentEmail: form.parentEmail || undefined,
      parentPhone: form.parentPhone || undefined,
      parentRelation: form.parentRelation || undefined,
    };

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create player");
      return;
    }

    // If a parent account was created, show credentials before navigating
    if (data.parentTempPassword) {
      setParentCredentials({
        password: data.parentTempPassword,
        email: data.parentLoginEmail ?? "",
        name: form.parentName ?? "",
      });
      return; // wait for admin to close modal before navigating
    }

    router.push("/dashboard/admin/players");
    router.refresh();
  }

  return (
    <div>
      <Header title={dict.common.addNewPlayer} subtitle={dict.common.playerInformation} />
      <div className="p-4 md:p-8 max-w-2xl">
        <Link
          href="/dashboard/admin/players"
          className="inline-flex items-center gap-2 text-sm mb-6 hover:text-[var(--accent)] transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} /> Back to Players
        </Link>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="font-semibold text-lg mb-6">{dict.common.playerInformation}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="name" label={dict.form.fullName} placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              <Input
                id="email"
                type="email"
                label={dict.form.email}
                placeholder="player@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
              <Input
                id="password"
                type="password"
                label={dict.form.initialPassword}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
              />
              <Select
                id="category"
                label={dict.common.category}
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                options={[
                  { value: "", label: dict.form.selectCategory },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              {hasZones && (
                <Select
                  id="zone"
                  label="Sede / Zona"
                  value={form.zone}
                  onChange={(e) => update("zone", e.target.value)}
                  options={[
                    { value: "", label: "Seleccionar sede..." },
                    ...ZONES.map((z) => ({
                      value: z,
                      label: `${z} — $${(zonePrices![z] ?? 0).toLocaleString("es-CO")}`,
                    })),
                  ]}
                />
              )}
              <Input
                id="dob"
                type="date"
                label={dict.form.dateOfBirth}
                value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
              />
              <Input
                id="documentNumber"
                label={dict.form.documentNumber ?? "Document number"}
                value={form.documentNumber}
                onChange={(e) => update("documentNumber", e.target.value)}
              />
              <Input id="address" label={dict.form.address ?? "Address"} value={form.address} onChange={(e) => update("address", e.target.value)} />
              <Input id="phone" label={dict.form.phone ?? "Phone (WhatsApp)"} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              <Input id="joinDate" type="date" label={dict.form.joinDate ?? "Join date"} value={form.joinDate} onChange={(e) => update("joinDate", e.target.value)} />
              <Input id="monthlyFee" type="number" label={dict.form.monthlyFee ?? "Monthly fee"} value={form.monthlyFee} onChange={(e) => update("monthlyFee", e.target.value)} />

              <h3 className="font-semibold mt-3">Acudiente / Tutor (opcional)</h3>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>El acudiente inicia sesión con el número de documento del deportista como usuario y contraseña.</p>
              <Input id="parentName" label={dict.form.parentName ?? "Parent name"} value={form.parentName} onChange={(e) => update("parentName", e.target.value)} />
              <Input id="parentPhone" label={dict.form.parentPhone ?? "Parent phone"} value={form.parentPhone} onChange={(e) => update("parentPhone", e.target.value)} />
              <Input id="parentRelation" label={dict.form.parentRelation ?? "Relation"} value={form.parentRelation} onChange={(e) => update("parentRelation", e.target.value)} />
            </div>

            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? dict.common.creating : dict.common.createPlayer}
              </Button>
              <Link href="/dashboard/admin/players">
                <Button type="button" variant="secondary">
                  {dict.common.cancel}
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>

      {/* Parent credentials modal */}
      {parentCredentials && (
        <ParentCredentialsModal
          credentials={parentCredentials}
          onClose={() => {
            setParentCredentials(null);
            router.push("/dashboard/admin/players");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ParentCredentialsModal({
  credentials,
  onClose,
}: {
  credentials: { password: string; email: string; name: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  function copy(text: string, field: "email" | "password") {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-base">¡Jugador creado!</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Comparte estos datos con el acudiente
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl p-4 space-y-3"
          style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="text-xs font-bold tracking-wider uppercase" style={{ color: "rgba(167,139,250,0.70)" }}>
            Acceso de {credentials.name}
          </p>

          <div className="space-y-2">
            {[
              { label: "Email / Usuario", value: credentials.email, field: "email" as const },
              { label: "Contraseña temporal", value: credentials.password, field: "password" as const },
            ].map((row) => (
              <div key={row.field} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {row.label}
                  </p>
                  <p className={`font-mono font-bold mt-0.5 ${row.field === "password" ? "text-xl tracking-widest" : "text-sm"}`}
                    style={{ color: row.field === "password" ? "#C4B5FD" : "rgba(255,255,255,0.85)" }}>
                    {row.value}
                  </p>
                </div>
                <button onClick={() => copy(row.value, row.field)}
                  className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                  style={{ color: copied === row.field ? "#34D399" : "rgba(255,255,255,0.35)" }}>
                  {copied === row.field ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
            Pídele que cambie la contraseña en su perfil después de entrar.
          </p>
        </div>

        <button onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--accent)", color: "#000" }}>
          Listo, ya la compartí
        </button>
      </div>
    </div>
  );
}
