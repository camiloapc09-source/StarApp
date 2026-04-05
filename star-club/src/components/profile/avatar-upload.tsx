"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Clock, XCircle, Upload, Loader2, Info } from "lucide-react";
import Image from "next/image";

interface Props {
  currentAvatar: string | null;
  pendingAvatar: string | null;
  avatarStatus: string; // NONE | PENDING | APPROVED | REJECTED
  userName: string;
}

export default function AvatarUpload({ currentAvatar, pendingAvatar, avatarStatus, userName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Imagen demasiado grande (máx. 5 MB)"); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    if (res.ok) {
      setDone(true);
      setPreview(null);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al subir la foto");
    }
    setUploading(false);
  }

  const statusBadge: Record<string, { icon: React.ReactNode; text: string; color: string }> = {
    PENDING:  { icon: <Clock size={13} />,        text: "En revisión por el admin",   color: "var(--warning)" },
    APPROVED: { icon: <CheckCircle2 size={13} />, text: "Foto aprobada",              color: "var(--success)" },
    REJECTED: { icon: <XCircle size={13} />,      text: "Foto rechazada — sube otra", color: "var(--error)"   },
  };
  const badge = statusBadge[avatarStatus];

  const displaySrc = currentAvatar ?? null;
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex items-start gap-5">
      {/* Current avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {displaySrc ? (
            <Image src={displaySrc} alt={userName} width={80} height={80} className="object-cover w-full h-full" />
          ) : (
            initial
          )}
        </div>
        {avatarStatus === "PENDING" && pendingAvatar && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--warning)" }}
          >
            <Clock size={10} color="#000" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Status indicator */}
        {badge && (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: badge.color }}>
            {badge.icon}
            {badge.text}
          </p>
        )}

        {/* Requirements info */}
        <div
          className="flex items-start gap-2 rounded-xl p-3 text-xs"
          style={{ background: "rgba(99,179,237,0.08)", color: "var(--text-secondary)" }}
        >
          <Info size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#63b3ed" }} />
          <span>La foto debe ser tipo cédula (primer plano, fondo claro) <strong>con el uniforme del club</strong>. El admin la revisará antes de publicarla.</span>
        </div>

        {/* Preview */}
        {preview && (
          <div className="flex items-center gap-3">
            <Image src={preview} alt="preview" width={56} height={56} className="w-14 h-14 rounded-xl object-cover" />
            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Vista previa</p>
              <div className="flex gap-2">
                <button
                  onClick={upload}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {uploading ? "Subiendo..." : "Enviar para aprobación"}
                </button>
                <button
                  onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {!preview && !done && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={avatarStatus === "PENDING"}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            <Camera size={13} />
            {avatarStatus === "PENDING" ? "Foto pendiente de revisión" : "Cambiar foto de perfil"}
          </button>
        )}

        {done && (
          <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--success)" }}>
            <CheckCircle2 size={13} />
            Foto enviada — pendiente de aprobación del admin.
          </p>
        )}

        {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
