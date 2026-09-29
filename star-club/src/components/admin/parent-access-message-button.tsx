"use client";

import { useState } from "react";
import { Check, Copy, MessageCircleMore } from "lucide-react";

/** Mensaje para el grupo de WhatsApp con cómo entran los acudientes. */
export default function ParentAccessMessageButton({ clubName = "el club" }: { clubName?: string }) {
  const [copied, setCopied] = useState(false);

  const message =
    `¡Hola familias! 👋 Así entran a la app de *${clubName}* 📲\n\n` +
    `👤 *Usuario:* su número de celular registrado en el club\n` +
    `🔑 *Contraseña:* el número de documento de su hijo(a)\n\n` +
    `Si tienen varios hijos en el club, sirve el documento de cualquiera de ellos.\n` +
    `Si no pueden entrar, escríbannos para actualizar su celular. ¡Gracias! 💚`;

  function copy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={copy}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
        {copied ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar mensaje</>}
      </button>
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`}
        target="_blank" rel="noreferrer"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
        <MessageCircleMore size={14} /> Enviar al grupo
      </a>
    </div>
  );
}
