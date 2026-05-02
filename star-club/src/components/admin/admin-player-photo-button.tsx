"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props {
  playerId: string;
  playerName: string;
  currentPhoto: string | null;
}

export default function AdminPlayerPhotoButton({ playerId, playerName, currentPhoto }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/players/${playerId}/photo`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al subir la foto");
    } else {
      setOpen(false);
      setPreview(null);
      setFile(null);
      router.refresh();
    }
    setUploading(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la foto de ${playerName}?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/players/${playerId}/photo`, { method: "DELETE" });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    setDeleting(false);
  }

  function handleClose() {
    setOpen(false);
    setPreview(null);
    setFile(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
      >
        <Camera size={13} /> Foto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Foto del deportista</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {playerName} · tipo carnet (cara visible, uniforme)
                </p>
              </div>
              <button type="button" onClick={handleClose} className="p-1 rounded-lg hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {/* Preview / current photo */}
            <div
              className="relative mx-auto rounded-xl overflow-hidden"
              style={{ width: 160, height: 200, background: "var(--bg-elevated)", border: "1px solid var(--border-primary)" }}
            >
              {(preview ?? currentPhoto) ? (
                <Image
                  src={preview ?? currentPhoto!}
                  alt={playerName}
                  fill
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--text-muted)" }}>
                  <Camera size={32} style={{ opacity: 0.3 }} />
                  <span className="text-xs">Sin foto</span>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)" }}>
                {error}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(139,92,246,0.08)" }}
              >
                {preview ? "Cambiar foto" : "Seleccionar foto"}
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? "Subiendo..." : "Guardar foto"}
                </button>
              )}

              {currentPhoto && !preview && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(239,68,68,0.10)", color: "var(--error)", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  <Trash2 size={13} />
                  Eliminar foto
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium border hover:opacity-70"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
