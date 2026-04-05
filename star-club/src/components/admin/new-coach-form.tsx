"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewCoachForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", emergencyContact: "", eps: "", branch: "Sede Norte" });
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, role: 'COACH' }) });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Failed'); else alert('Created');
    } catch (e) {
      console.error(e);
      alert('Failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" required />
      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Correo electrónico" required />
      <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" required />

      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono (WhatsApp)" />
      <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Contacto de emergencia" />
      <Input value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} placeholder="EPS / Seguro" />

      <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="w-full rounded-lg border px-3 py-2">
        <option>Sede Norte</option>
        <option>Sede Sur</option>
      </select>

      <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear entrenador'}</Button>
    </form>
  );
}
