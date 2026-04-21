import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isResponse, apiOk, apiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) return apiError("Suscripción inválida", 400);

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return apiOk({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const { endpoint } = await req.json();
  if (!endpoint) return apiError("endpoint requerido", 400);

  await db.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  return apiOk({ ok: true });
}
