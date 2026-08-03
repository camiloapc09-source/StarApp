import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"]),
});

// PATCH /api/uniforms/[id] — admin updates order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  // El pedido debe pertenecer a un deportista del club del admin.
  const existing = await db.uniformOrder.findFirst({
    where: { id, player: { clubId } },
    select: { id: true },
  });
  if (!existing) return apiError("Pedido no encontrado", 404);

  const order = await db.uniformOrder.update({
    where: { id },
    data: { status: parsed.data.status },
    include: {
      parent: { include: { user: { select: { id: true } } } },
      player: {
        select: {
          userId: true,
          parentLinks: { select: { parent: { select: { userId: true } } } },
        },
      },
    },
  });

  const statusLabels: Record<string, string> = {
    CONFIRMED:  "confirmado ✅",
    DELIVERED:  "entregado 📦",
    CANCELLED:  "cancelado ❌",
  };

  if (parsed.data.status !== "PENDING" && statusLabels[parsed.data.status]) {
    // Avisa al deportista y a todos sus acudientes, sin repetir usuarios.
    const userIds = [
      ...new Set([
        order.player.userId,
        ...order.player.parentLinks.map((l) => l.parent.userId),
        ...(order.parent ? [order.parent.user.id] : []),
      ]),
    ];

    try {
      await db.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title:   "Pedido de uniforme actualizado",
          message: `El pedido de uniforme fue ${statusLabels[parsed.data.status]}.`,
          type:    "INFO",
        })),
      });
    } catch { /* no crítico */ }
  }

  return apiOk(order);
}
