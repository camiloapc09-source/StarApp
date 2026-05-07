import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const PRICES: Record<string, number> = {
  TRAINING:     75000,
  GAME:        100000,
  PRESENTATION: 150000,
};

const SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

const orderSchema = z.object({
  playerId:       z.string().min(1),
  type:           z.enum(["TRAINING", "GAME", "PRESENTATION"]),
  jerseySize:     z.enum(SIZES),
  shortsSize:     z.enum(SIZES),
  nameOnJersey:   z.string().min(1).max(40).trim(),
  numberOnJersey: z.number().int().min(0).max(99).optional().nullable(),
  notes:          z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body   = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const player = await db.player.findFirst({
    where: { id: parsed.data.playerId, clubId },
    include: { user: { select: { name: true } } },
  });
  if (!player) return apiError("Jugador no encontrado", 404);

  if (parsed.data.type === "GAME") {
    if (parsed.data.numberOnJersey == null) {
      return apiError("El uniforme de juego requiere un número en la camiseta.", 400);
    }
    const conflict = await db.uniformOrder.findFirst({
      where: { type: "GAME", numberOnJersey: parsed.data.numberOnJersey, status: { notIn: ["CANCELLED"] } },
    });
    if (conflict) return apiError(`El número #${parsed.data.numberOnJersey} ya está en uso en otro pedido.`, 409);
  }

  const unitPrice = PRICES[parsed.data.type];

  const order = await db.uniformOrder.create({
    data: {
      playerId: player.id,
      parentId: null,
      type: parsed.data.type,
      jerseySize: parsed.data.jerseySize,
      shortsSize: parsed.data.shortsSize,
      nameOnJersey: parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey ?? null,
      unitPrice,
      totalPrice: unitPrice,
      notes: parsed.data.notes ?? null,
      status: "PENDING",
    },
  });

  return apiOk(order, 201);
}
