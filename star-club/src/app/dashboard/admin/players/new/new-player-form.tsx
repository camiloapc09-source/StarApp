"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
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

    router.push("/dashboard/admin/players");
    router.refresh();
  }

  return (
    <div>
      <Header title={dict.common.addNewPlayer} subtitle={dict.common.playerInformation} />
      <div className="p-8 max-w-2xl">
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
              <Input id="parentName" label={dict.form.parentName ?? "Parent name"} value={form.parentName} onChange={(e) => update("parentName", e.target.value)} />
              <Input id="parentEmail" type="email" label={dict.form.parentEmail ?? "Parent email"} value={form.parentEmail} onChange={(e) => update("parentEmail", e.target.value)} />
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
    </div>
  );
}
