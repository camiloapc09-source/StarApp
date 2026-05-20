"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ParentSentBadge({ userId }: { userId: string }) {
  const [sentAt, setSentAt] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`wa_sent_${userId}`);
    if (stored) setSentAt(Number(stored));

    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.userId === userId) setSentAt(Date.now());
    };
    window.addEventListener("wa-credentials-sent", handler);
    return () => window.removeEventListener("wa-credentials-sent", handler);
  }, [userId]);

  if (!sentAt) return null;

  return (
    <span
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: "rgba(37,211,102,0.10)", color: "#34D399", border: "1px solid rgba(37,211,102,0.20)" }}
    >
      <CheckCircle2 size={11} />
      Enviado {format(new Date(sentAt), "d MMM, h:mm a", { locale: es })}
    </span>
  );
}
