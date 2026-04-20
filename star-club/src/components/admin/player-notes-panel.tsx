"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StickyNote, Plus, Trash2, Loader2 } from "lucide-react";

interface Note {
  id: string;
  body: string;
  createdAt: string | Date;
  authorId: string;
}

interface Props {
  playerId: string;
  initialNotes: Note[];
  /** Name of the currently-logged-in admin/coach (for optimistic display) */
  authorName: string;
}

export default function PlayerNotesPanel({ playerId, initialNotes, authorName }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addNote() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/players/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setNotes((prev) => [data.note, ...prev]);
      setText("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    setDeletingId(noteId);
    try {
      const res = await fetch("/api/admin/players/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) return;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StickyNote size={15} style={{ color: "var(--warning)" }} />
        <h3 className="text-sm font-semibold">Notas del entrenador</h3>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agregar observación (lesión, comportamiento, avance…)"
          className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-primary)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote();
          }}
        />
        {error && (
          <p className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "var(--error)" }}>
            {error}
          </p>
        )}
        <button
          onClick={addNote}
          disabled={saving || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(255,184,0,0.15)", color: "var(--warning)", border: "1px solid rgba(255,184,0,0.25)" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Agregar nota
        </button>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl px-4 py-3 flex gap-3"
              style={{ background: "rgba(255,184,0,0.04)", border: "1px solid rgba(255,184,0,0.10)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{note.body}</p>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  {format(new Date(note.createdAt), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <button
                onClick={() => deleteNote(note.id)}
                disabled={deletingId === note.id}
                className="flex-shrink-0 p-1 rounded-lg hover:opacity-70 transition-opacity disabled:opacity-30 self-start mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                {deletingId === note.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs py-3 text-center" style={{ color: "var(--text-muted)" }}>
          Aún no hay notas para este jugador.
        </p>
      )}
    </div>
  );
}
