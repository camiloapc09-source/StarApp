import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  userId: z.string().cuid(),
});

// POST /api/admin/avatar-review  admin approves or rejects a pending avatar
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { action, userId } = parsed.data;
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, avatarPending: true, avatarStatus: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.avatarStatus !== "PENDING") {
    return NextResponse.json({ error: "No hay foto pendiente para este usuario" }, { status: 400 });
  }

  if (action === "approve") {
    await db.user.update({
      where: { id: userId },
      data: { avatar: target.avatarPending, avatarPending: null, avatarStatus: "APPROVED" },
    });
    await db.notification.create({
      data: {
        userId,
        title: "Foto de perfil aprobada ",
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

  return NextResponse.json({ ok: true, action });
}
