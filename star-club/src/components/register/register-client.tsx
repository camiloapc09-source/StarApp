"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export default function RegisterClient() {
  const search = useSearchParams();
  const codeParam = search.get("code") || "";
  // Club slug passed from the login page (/register?club=ballbreakers)
  const clubSlug = search.get("club") || "";
  const router = useRouter();

  const [isModalOpen, setModalOpen] = useState(!codeParam);
  const [modalRole, setModalRole] = useState<"PLAYER" | "COACH" | "">("");
  const [modalCode, setModalCode] = useState(codeParam);

  const [code, setCode] = useState(codeParam);
  const [invite, setInvite] = useState<{ role: string; club?: { name: string; slug: string; logo: string | null } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", dateOfBirth: "", documentNumber: "", phone: "", address: "", parentName: "", parentEmail: "", parentPhone: "", parentRelation: "", emergencyContact: "", eps: "", branch: "" });

  // Derive redirect target: prefer slug from the verified invite, fallback to URL param, fallback to "/"
  const redirectSlug = invite?.club?.slug || clubSlug || null;

  useEffect(() => {
    async function fetchInvite() {
      if (!code) return;
      try {
        const res = await fetch(`/api/invites?code=${encodeURIComponent(code)}`);
        if (res.ok) setInvite(await res.json());
        else setInvite(null);
      } catch (e) {
        console.error(e);
      }
    }
    fetchInvite();
  }, [code]);

  async function handleModalContinue() {
    if (!modalRole) return alert("Seleccione el tipo: Deportista o Entrenador");
    if (!modalCode) return alert("Ingrese el código de registro");

    try {
      const res = await fetch(`/api/invites?code=${encodeURIComponent(modalCode)}`);
      if (!res.ok) return alert("Código inválido");
      const inv = await res.json();
      const invRole = (inv?.role || "PLAYER").toUpperCase();
      if (invRole !== modalRole) return alert("El código no corresponde al tipo seleccionado.");

      setInvite(inv);
      setCode(modalCode);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error verificando código");
    }
  }

  const isMinor = (() => {
    if (!form.dateOfBirth) return false;
    const today = new Date();
    const birth = new Date(form.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isMinor && (!form.parentName || !form.parentPhone || !form.parentRelation)) {
      alert('El deportista es menor de edad. Los datos del acudiente son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { code, name: form.name, email: form.email, dateOfBirth: form.dateOfBirth, documentNumber: form.documentNumber, phone: form.phone };
      if (modalRole === "COACH") {
        payload.password = form.password;
        payload.phone = form.phone || undefined;
        payload.emergencyContact = form.emergencyContact || undefined;
        payload.eps = form.eps || undefined;
        payload.branch = form.branch || undefined;
      }
      if (modalRole === "PLAYER") {
        payload.address = form.address || undefined;
        payload.parentName = form.parentName || undefined;
        payload.parentPhone = form.parentPhone || undefined;
        payload.parentRelation = form.parentRelation || undefined;
      }

      const res = await fetch('/api/invites/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        alert('¡Registro exitoso! Ya puedes iniciar sesión.');
        router.push(redirectSlug ? `/${redirectSlug}` : '/');
      } else {
        alert(data.error || 'Error al registrar');
      }
    } catch (e) {
      console.error(e);
      alert('Error al registrar');
    } finally { setLoading(false); }
  }

  // Club info to show in header (from invite or just from URL param)
  const clubName = invite?.club?.name;
  const clubLogo = invite?.club?.logo;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Back link */}
        <div className="mb-6">
          <a
            href={redirectSlug ? `/${redirectSlug}` : '/'}
            className="inline-flex items-center gap-2 text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ← Volver al inicio de sesión
          </a>
        </div>

        {/* Club header */}
        {(clubLogo || clubName) && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}>
            {clubLogo && (
              <img
                src={clubLogo}
                alt={clubName ?? "Club"}
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }}
              />
            )}
            <div>
              <p className="font-bold text-sm">{clubName}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Registro de miembro</p>
            </div>
          </div>
        )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Registrarse">
        <p className="mb-4">Seleccione el tipo de registro y luego ingrese el código:</p>
        <div className="flex gap-3 mb-4">
          <Button variant={modalRole === 'PLAYER' ? undefined : 'ghost'} onClick={() => setModalRole('PLAYER')}>Registrar deportista</Button>
          <Button variant={modalRole === 'COACH' ? undefined : 'ghost'} onClick={() => setModalRole('COACH')}>Registrar entrenador</Button>
        </div>
        <Input placeholder="Código de registro" value={modalCode} onChange={(e) => setModalCode(e.target.value)} className="mb-4" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleModalContinue}>Continuar</Button>
        </div>
      </Modal>

      <h1 className="text-2xl font-bold mb-4">Registro</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de registro" />
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" required />
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Correo electrónico" required />

        {modalRole === 'COACH' && (
          <>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" required />
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono (WhatsApp)" />
            <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Contacto de emergencia" />
            <Input value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} placeholder="EPS / Seguro" />
            <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="Sede / Zona (ej: NORTE, SUR, CENTRO)" />
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Fecha de nacimiento{isMinor ? ' *' : ''}
          </label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required />
          {isMinor && <p className="text-xs mt-1" style={{ color: 'var(--accent-warning, #f59e0b)' }}>El deportista es menor de edad — datos del acudiente requeridos.</p>}
        </div>
        <Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="Número de documento" required />
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="WhatsApp / Teléfono" />

        {modalRole === 'PLAYER' && (
          <>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección de residencia" />

            <h3 className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
              Datos del acudiente {isMinor ? <span style={{ color: 'var(--accent-danger, #ef4444)' }}>(obligatorio)</span> : '(opcional)'}
            </h3>
            <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder={isMinor ? 'Nombre del acudiente *' : 'Nombre del acudiente'} required={isMinor} />
            <Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder={isMinor ? 'WhatsApp del acudiente *' : 'WhatsApp del acudiente'} required={isMinor} />
            <select
              value={form.parentRelation}
              onChange={(e) => setForm({ ...form, parentRelation: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              required={isMinor}
            >
              <option value="">Relación con el deportista</option>
              <option>Padre</option>
              <option>Madre</option>
              <option>Abuelo/a</option>
              <option>Tío/a</option>
              <option>Hermano/a</option>
              <option>Acudiente</option>
            </select>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>La contraseña del deportista y del acudiente será el número de documento. El acudiente inicia sesión con el número de documento como usuario y contraseña.</p>
          </>
        )}

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Registrando...' : 'Registrarse'}</Button>
        </div>
      </form>
      </div>
    </div>
  );
}
