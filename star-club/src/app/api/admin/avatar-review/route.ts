import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  userId: z.string().cuid(),
});

// POST /api/admin/avatar-review - admin approves or rejects a pending avatar
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { action, userId } = parsed.data;
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, avatarPending: true, avatarStatus: true, clubId: true },
  });
  if (!target || target.clubId !== clubId) return apiError("User not found", 404);

  if (target.avatarStatus !== "PENDING") return apiError("No hay foto pendiente para este usuario", 400);

  if (action === "approve") {
    await db.user.update({
      where: { id: userId },
      data: { avatar: target.avatarPending, avatarPending: null, avatarStatus: "APPROVED" },
    });
    await db.notification.create({
      data: {
        userId,
        title: "Foto de perfil aprobada ",
        message: "Tu foto de perfil fue aprobada y ya es visible.",
        type: "INFO",
      },
    });
  } else {
    await db.user.update({
      where: { id: userId },
      data: { avatarPending: null, avatarStatus: "REJECTED" },
    });
    await db.notification.create({
      data: {
        userId,
        title: "Foto de perfil rechazada L",
        message: "Tu foto de perfil fue rechazada. Recuerda que debe ser formato cédula con uniforme del club.",
        type: "INFO",
      },
    });
  }

  return apiOk({ ok: true, action });
}
