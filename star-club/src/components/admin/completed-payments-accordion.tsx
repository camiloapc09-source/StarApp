"use client";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PaymentDeleteButton } from "@/components/admin/payment-actions";

type Payment = {
  id: string;
  amount: number;
  concept: string;
  paidAt: Date | string | null;
  dueDate: Date | string;
  paymentMethod: string | null;
  player: {
    user: { name: string; avatar?: string | null };
  };
};

export default function CompletedPaymentsAccordion({ payments }: { payments: Payment[] }) {
  const sorted = [...payments].sort(
    (a, b) =>
      new Date(b.paidAt ?? b.dueDate).getTime() -
      new Date(a.paidAt ?? a.dueDate).getTime()
  );

  // Group by calendar month of paidAt (fallback to dueDate)
  const groupMap = new Map<
    string,
    { label: string; key: string; total: number; items: Payment[] }
  >();
  for (const p of sorted) {
    const d = new Date(p.paidAt ?? p.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        label: format(d, "MMMM yyyy", { locale: es }),
        total: 0,
        items: [],
      });
    }
    const g = groupMap.get(key)!;
    g.items.push(p);
    g.total += p.amount;
  }

  const groups = [...groupMap.values()];

  // Most recent month open by default
  const [open, setOpen] = useState<Set<string>>(
    groups.length > 0 ? new Set([groups[0].key]) : new Set()
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const methodLabel = (m: string | null) => {
    if (m === "CASH") return "Efectivo";
    if (m === "TRANSFER") return "Transf.";
    if (m === "NEQUI") return "Nequi";
    if (m === "PSE") return "PSE";
    if (m === "CARD") return "Tarjeta";
    return m ?? "";
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border-primary)", background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
        <h2 className="text-sm font-semibold">
          Pagos confirmados — {payments.length}
        </h2>
        <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
          {groups.length} {groups.length === 1 ? "mes" : "meses"}
        </span>
      </div>

      {/* Month groups */}
      {groups.map((group) => {
        const isOpen = open.has(group.key);
        return (
          <div
            key={group.key}
            className="border-b last:border-0"
            style={{ borderColor: "var(--border-primary)" }}
          >
            {/* Month row — clickable */}
            <button
              onClick={() => toggle(group.key)}
              className="w-full px-6 py-3 flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
              style={{
                background: isOpen ? "rgba(0,255,135,0.03)" : "transparent",
              }}
            >
              {isOpen ? (
                <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
              ) : (
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
              )}
              <span className="text-sm font-semibold capitalize">{group.label}</span>
              <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                · {group.items.length} {group.items.length === 1 ? "pago" : "pagos"}
              </span>
              <span
                className="ml-auto text-sm font-bold"
                style={{ color: "var(--success)" }}
              >
                ${group.total.toLocaleString("es-CO")}
              </span>
            </button>

            {/* Payment rows */}
            {isOpen && (
              <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
                {group.items.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-4 px-6 py-3 pl-12"
                  >
                    <Avatar name={payment.player.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {payment.player.user.name}
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {payment.concept}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">
                        ${payment.amount.toLocaleString("es-CO")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {methodLabel(payment.paymentMethod)}{" "}
                        {format(
                          new Date(payment.paidAt ?? payment.dueDate),
                          "dd MMM",
                          { locale: es }
                        )}
                      </p>
                    </div>
                    <Badge variant="success">Pagado</Badge>
                    <PaymentDeleteButton
                      paymentId={payment.id}
                      playerName={payment.player.user.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
