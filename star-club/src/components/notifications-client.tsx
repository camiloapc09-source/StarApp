"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, MessageSquare, AlertTriangle, Zap, CreditCard, CalendarCheck, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  INFO:        MessageSquare,
  ALERT:       AlertTriangle,
  ACHIEVEMENT: Zap,
  PAYMENT:     CreditCard,
  ATTENDANCE:  CalendarCheck,
};

export default function NotificationsClient({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initial);
  const [marking, setMarking] = useState(false);

  // Auto-mark all as read on mount
  useEffect(() => {
    const unread = initial.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).then(() => {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      router.refresh(); // refresh layout to update badge count
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function markAllRead() {
    setMarking(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    router.refresh();
    setMarking(false);
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="p-8">
      <div className="bg-[var(--bg-card)] rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-primary)" }}>
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: "var(--accent)" }} />
            <span className="font-semibold">Todas las notificaciones</span>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
            >
              <CheckCheck size={13} />
              Marcar todo como leído
            </button>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }} className="text-sm">
                ¡Todo al día! Sin notificaciones.
              </p>
            </div>
          ) : (
            items.map((n) => {
              const inner = (
                <div
                  className="flex items-start gap-4 px-6 py-4 transition-all"
                  style={{
                    background: n.isRead ? "transparent" : "rgba(0,255,135,0.03)",
                    borderLeft: n.isRead ? "3px solid transparent" : "3px solid var(--accent)",
                  }}
                >
                  {(() => { const Icon = TYPE_ICONS[n.type] ?? Bell; return <Icon size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />; })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {n.message}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(n.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <Badge
                    variant={
                      n.type === "ACHIEVEMENT" ? "accent"
                        : n.type === "PAYMENT"     ? "warning"
                        : n.type === "ALERT"       ? "error"
                        : "default"
                    }
                  >
                    {n.type}
                  </Badge>
                </div>
              );

              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  className="block hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
