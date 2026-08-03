import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import {
  UNIFORM_PRICES,
  UNIFORM_SIZES,
  validateGameUniform,
  notifyFamilyOrderCreated,
} from "@/lib/uniforms";

const orderSchema = z.object({
  playerId:       z.string().min(1),
  type:           z.enum(["TRAINING", "GAME", "PRESENTATION"]),
  jerseySize:     z.enum(UNIFORM_SIZES),
  shortsSize:     z.enum(UNIFORM_SIZES),
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
    include: {
      user: { select: { name: true } },
      parentLinks: { select: { parentId: true } },
    },
  });
  if (!player) return apiError("Deportista no encontrado", 404);

  if (parsed.data.type === "GAME") {
    // El admin puede rotular con cualquier nombre; solo se valida el número.
    const problem = await validateGameUniform({
      clubId,
      playerName:     player.user.name,
      nameOnJersey:   parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey,
      enforceName:    false,
    });
    if (problem) return apiError(problem, problem.includes("ya está en uso") ? 409 : 400);
  }

  const unitPrice = UNIFORM_PRICES[parsed.data.type];

  const order = await db.uniformOrder.create({
    data: {
      playerId: player.id,
      // Se asocia al acudiente del deportista si lo tiene, para que lo vea en su panel.
      parentId:       player.parentLinks[0]?.parentId ?? null,
      type:           parsed.data.type,
      jerseySize:     parsed.data.jerseySize,
      shortsSize:     parsed.data.shortsSize,
      nameOnJersey:   parsed.data.nameOnJersey,
      numberOnJersey: parsed.data.numberOnJersey ?? null,
      unitPrice,
      totalPrice:     unitPrice,
      notes:          parsed.data.notes ?? null,
      status:         "PENDING",
      createdById:    session.user.id,
      createdByRole:  "ADMIN",
    },
  });

  await notifyFamilyOrderCreated({
    playerId:       player.id,
    type:           parsed.data.type,
    jerseySize:     parsed.data.jerseySize,
    shortsSize:     parsed.data.shortsSize,
    numberOnJersey: parsed.data.numberOnJersey,
    totalPrice:     unitPrice,
  });

  return apiOk(order, 201);
}
