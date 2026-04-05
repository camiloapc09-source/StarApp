"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

interface Props {
  coachId: string;
  coachCategoryId: string | null;
  categories: Category[];
}

export function CoachCategorySelect({ coachId, coachCategoryId, categories }: Props) {
  const [value, setValue] = useState(coachCategoryId ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setSaved(false);
    startTransition(async () => {
      await fetch(`/api/admin/users/${coachId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachCategoryId: newValue || null }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="text-xs rounded-xl px-3 py-1.5 border outline-none cursor-pointer"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-primary)",
          color: "var(--text-secondary)",
          minWidth: 130,
        }}
        title="Categoría que dirige este entrenador"
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      {saved && (
        <span className="text-xs" style={{ color: "var(--success)" }}>
          ✓ Guardado
        </span>
      )}
    </div>
  );
}
