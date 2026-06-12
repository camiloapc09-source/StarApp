import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

type RouteCtx = { params: Promise<{ id: string }> };

// PATCH /api/admin/link-requests/[id]
// Approves or rejects a pending ParentPlayer link.
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  const clubId = getClubId(session);
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { action } = parsed.data;

  // Fetch the pending link and verify it belongs to this club
  const link = await db.parentPlayer.findUnique({
    where: { id },
    include: {
      parent: {
        include: {
          user: { select: { id: true, name: true, clubId: true } },
        },
      },
      player: {
        select: { clubId: true, user: { select: { name: true } } },
      },
    },
  });

  if (!link) return apiError("Solicitud no encontrada", 404);
  if (link.player.clubId !== clubId) return apiError("No autorizado", 403);
  if (link.status !== "PENDING") return apiError("Esta solicitud ya fue procesada", 409);

  const parentUserId = link.parent.user.id;
  const parentName = link.parent.user.name;
  const playerName = link.player.user.name;

  if (action === "APPROVE") {
    await db.parentPlayer.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await db.notification.create({
      data: {
        userId: parentUserId,
        title: "Solicitud aprobada",
        message: `Tu solicitud de vinculación con ${playerName} ha sido aprobada.`,
        type: "INFO",
      },
    });
  } else {
    // REJECT: delete the record
    await db.parentPlayer.delete({ where: { id } });

    await db.notification.create({
      data: {
        userId: parentUserId,
        title: "Solicitud rechazada",
        message: `Tu solicitud de vinculación con ${playerName} ha sido rechazada. Contacta al administrador si crees que es un error.`,
        type: "ALERT",
      },
    });
  }

  return apiOk({ ok: true, action, parentName, playerName });
}
