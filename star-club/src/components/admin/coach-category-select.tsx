"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Props {
  coachId: string;
  coachCategoryIds: string; // JSON array string
  categories: Category[];
}

export function CoachCategorySelect({ coachId, coachCategoryIds, categories }: Props) {
  const initialIds: string[] = (() => {
    try { return JSON.parse(coachCategoryIds); } catch { return []; }
  })();

  const [selected, setSelected] = useState<string[]>(initialIds);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setSaved(false);
    startTransition(async () => {
      await fetch(`/api/admin/users/${coachId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachCategoryIds: JSON.stringify(next) }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const selectedNames = categories.filter((c) => selected.includes(c.id)).map((c) => c.name);

  return (
    <div ref={ref} className="relative flex items-center gap-2 flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 border outline-none cursor-pointer transition-all hover:opacity-80"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-primary)",
          color: "var(--text-secondary)",
          minWidth: 140,
          maxWidth: 200,
        }}
        title="Categorías que dirige este entrenador"
      >
        <span className="flex-1 text-left truncate">
          {selectedNames.length === 0
            ? "Sin categoría"
            : selectedNames.length === 1
            ? selectedNames[0]
            : `${selectedNames.length} categorías`}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 rounded-xl shadow-lg border overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-primary)",
            minWidth: 180,
          }}
        >
          <div className="py-1">
            {categories.map((cat) => {
              const checked = selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggle(cat.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all hover:bg-[var(--bg-elevated)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                    style={{
                      background: checked ? "var(--accent)" : "transparent",
                      borderColor: checked ? "var(--accent)" : "var(--border-primary)",
                    }}
                  >
                    {checked && <Check size={10} color="#000" strokeWidth={3} />}
                  </span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {saved && (
        <span className="text-xs flex-shrink-0" style={{ color: "var(--success)" }}>
          ✓
        </span>
      )}
    </div>
  );
}
