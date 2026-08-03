import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShoppingBag, Shirt, CircleDot, Star, ListOrdered } from "lucide-react";
import UniformOrderForm, { type OrderablePlayer } from "@/components/uniforms/uniform-order-form";
import type { LucideIcon } from "lucide-react";

const UNIFORM_CATALOG: { type: string; name: string; description: string; price: number; Icon: LucideIcon }[] = [
  {
    type: "TRAINING",
    name: "Uniforme de entrenamiento",
    description: "Camiseta + pantaloneta. Material transpirable.",
    price: 75000,
    Icon: Shirt,
  },
  {
    type: "GAME",
    name: "Uniforme de juego doble faz",
    description: "Reversible local/visitante. Incluye camiseta y short.",
    price: 100000,
    Icon: CircleDot,
  },
  {
    type: "PRESENTATION",
    name: "Uniforme de presentación",
    description: "Buzo + pantaloneta de representación oficial del club.",
    price: 150000,
    Icon: Star,
  },
];

const ORDER_STATUS: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  PENDING:   { label: "Pendiente",  variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "success" },
  DELIVERED: { label: "Entregado",  variant: "success" },
  CANCELLED: { label: "Cancelado",  variant: "error"   },
};

export type FamilyOrder = {
  id: string;
  type: string;
  jerseySize: string;
  shortsSize: string;
  nameOnJersey: string;
  numberOnJersey: number | null;
  totalPrice: number;
  status: string;
  createdByRole: string | null;
  createdAt: Date;
  player: { user: { name: string } };
};

/**
 * Catálogo + historial de pedidos. Lo comparten el panel del acudiente y el
 * del deportista; la única diferencia es qué deportistas puede pedir cada uno.
 */
export function UniformsView({
  players,
  orders,
  showPlayerName = false,
}: {
  players: OrderablePlayer[];
  orders: FamilyOrder[];
  /** Un acudiente con varios hijos necesita ver de quién es cada pedido. */
  showPlayerName?: boolean;
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl">
      {/* Catalog */}
      <Card>
        <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
          <ShoppingBag size={15} style={{ color: "var(--accent)" }} />
          Catálogo de uniformes
        </h3>
        <div className="space-y-4">
          {UNIFORM_CATALOG.map((item) => (
            <div
              key={item.type}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-hover)" }}>
                    <item.Icon size={18} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                  </div>
                </div>
                <p className="font-bold text-base flex-shrink-0" style={{ color: "var(--accent)" }}>
                  ${item.price.toLocaleString("es-CO")}
                </p>
              </div>
              <UniformOrderForm type={item.type} unitPrice={item.price} players={players} />
            </div>
          ))}
        </div>
      </Card>

      {/* Order history */}
      {orders.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ListOrdered size={15} style={{ color: "var(--text-secondary)" }} />
            Mis pedidos
          </h3>
          <div className="space-y-3">
            {orders.map((order) => {
              const meta = ORDER_STATUS[order.status] ?? { label: order.status, variant: "default" as const };
              const typeName = UNIFORM_CATALOG.find((c) => c.type === order.type)?.name ?? order.type;
              return (
                <div key={order.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {typeName}
                      {showPlayerName && (
                        <span style={{ color: "var(--text-muted)" }}> · {order.player.user.name}</span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Camiseta {order.jerseySize} · Pantaloneta {order.shortsSize}
                      {order.numberOnJersey != null ? ` · #${order.numberOnJersey}` : ""}
                      {" · "}{order.nameOnJersey}
                      {" · "}{format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                    {order.createdByRole === "ADMIN" && (
                      <p className="text-xs mt-0.5 italic" style={{ color: "var(--text-muted)" }}>
                        Registrado por el club
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">${order.totalPrice.toLocaleString("es-CO")}</p>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
