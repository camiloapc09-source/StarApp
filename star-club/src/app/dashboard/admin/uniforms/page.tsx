import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Package, FileSpreadsheet } from "lucide-react";
import UniformStatusButton from "@/components/admin/uniform-status-button";
import Link from "next/link";

const TYPE_NAMES: Record<string, string> = {
  TRAINING:     "Entrenamiento",
  GAME:         "Juego doble faz",
  PRESENTATION: "Presentación",
};

const ORDER_STATUS: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  PENDING:   { label: "Pendiente",  variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "success" },
  DELIVERED: { label: "Entregado",  variant: "success" },
  CANCELLED: { label: "Cancelado",  variant: "error"   },
};

export default async function AdminUniformsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const orders = await db.uniformOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      player: { include: { user: { select: { name: true, avatar: true } } } },
      parent: { include: { user: { select: { name: true } } } },
    },
  });

  const pending   = orders.filter((o) => o.status === "PENDING");
  const confirmed = orders.filter((o) => o.status === "CONFIRMED");
  const rest      = orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED");

  const stats = {
    total:    orders.filter((o) => o.status !== "CANCELLED").length,
    pending:  pending.length,
    revenue:  orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totalPrice, 0),
  };

  return (
    <div>
      <Header title="Pedidos de uniformes" subtitle={`${stats.total} pedidos activos`} />
      <div className="p-8 space-y-6">

        {/* Stats + export */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="grid grid-cols-3 gap-4 flex-1 min-w-0">
            <Card>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total pedidos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Pendientes</p>
              <p className="text-2xl font-bold" style={{ color: stats.pending > 0 ? "var(--warning)" : "var(--text-primary)" }}>
                {stats.pending}
              </p>
            </Card>
            <Card>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total $</p>
              <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                ${stats.revenue.toLocaleString("es-CO")}
              </p>
            </Card>
          </div>

          {/* Export button */}
          <Link
            href="/api/admin/uniforms/export"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-80 whitespace-nowrap self-start mt-0.5"
            style={{
              background: "rgba(0,255,135,0.08)",
              color: "var(--success)",
              borderColor: "rgba(0,255,135,0.25)",
            }}
          >
            <FileSpreadsheet size={15} />
            Exportar Excel
          </Link>
        </div>

        {/* Pending orders */}
        {pending.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Package size={15} style={{ color: "var(--warning)" }} /> Pendientes de confirmar
            </h3>
            <div className="space-y-4">
              {pending.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          </Card>
        )}

        {/* Confirmed orders */}
        {confirmed.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Package size={15} style={{ color: "var(--success)" }} /> Confirmados - en produccion
            </h3>
            <div className="space-y-4">
              {confirmed.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          </Card>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
              Historial (entregados / cancelados)
            </h3>
            <div className="space-y-3">
              {rest.map((order) => (
                <OrderRow key={order.id} order={order} compact />
              ))}
            </div>
          </Card>
        )}

        {orders.length === 0 && (
          <Card>
            <div className="text-center py-10">
              <Package size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No hay pedidos de uniformes todavía.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  compact = false,
}: {
  order: {
    id: string;
    type: string;
    jerseySize: string;
    shortsSize: string;
    nameOnJersey: string;
    numberOnJersey: number | null;
    unitPrice: number;
    totalPrice: number;
    status: string;
    notes: string | null;
    createdAt: Date;
    player: { user: { name: string; avatar: string | null } };
    parent: { user: { name: string } };
  };
  compact?: boolean;
}) {
  const meta     = ORDER_STATUS[order.status] ?? { label: order.status, variant: "default" as const };
  const typeName = TYPE_NAMES[order.type] ?? order.type;

  return (
    <div
      className="flex items-start gap-4 rounded-xl p-4 border"
      style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
    >
      <Avatar name={order.player.user.name} src={order.player.user.avatar} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-sm">{order.player.user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Padre/Tutor: {order.parent.user.name}
            </p>
            <div className="grid grid-cols-2 gap-x-6 mt-2 text-xs">
              <span><span style={{ color: "var(--text-muted)" }}>Tipo:</span> <strong>{typeName}</strong></span>
              <span><span style={{ color: "var(--text-muted)" }}>Nombre:</span> <strong>{order.nameOnJersey}</strong> {order.numberOnJersey != null && <strong>#{order.numberOnJersey}</strong>}</span>
              <span><span style={{ color: "var(--text-muted)" }}>Camiseta:</span> <strong>{order.jerseySize}</strong></span>
              <span><span style={{ color: "var(--text-muted)" }}>Pantaloneta:</span> <strong>{order.shortsSize}</strong></span>
            </div>
            {order.notes && (
              <p className="text-xs mt-1.5 italic" style={{ color: "var(--text-muted)" }}>Nota: {order.notes}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Pedido: {format(new Date(order.createdAt), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="text-right flex-shrink-0 space-y-1">
            <p className="font-bold">${order.totalPrice.toLocaleString("es-CO")}</p>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </div>
        {!compact && <UniformStatusButton orderId={order.id} currentStatus={order.status} />}
      </div>
    </div>
  );
}
