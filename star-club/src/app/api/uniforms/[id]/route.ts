import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, isResponse, apiError, apiOk } from "@/lib/api";

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

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const order = await db.uniformOrder.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { parent: { include: { user: { select: { id: true, name: true } } } } },
  });

  const statusLabels: Record<string, string> = {
    CONFIRMED:  "confirmado ✅",
    DELIVERED:  "entregado 📦",
    CANCELLED:  "cancelado ❌",
  };

  if (parsed.data.status !== "PENDING" && statusLabels[parsed.data.status]) {
    await db.notification.create({
      data: {
        userId:  order.parent.user.id,
        title:   "Pedido de uniforme actualizado",
        message: `Tu pedido de uniforme fue ${statusLabels[parsed.data.status]}.`,
        type:    "INFO",
      },
    });
  }

  return apiOk(order);
}
