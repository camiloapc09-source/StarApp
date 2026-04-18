import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { requireAuth, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  if (!rateLimit(`chpass:${session.user.id}`, 5, 60_000)) return apiError("Too many attempts", 429);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) return apiError("Usuario no encontrado", 404);

  const valid = await compare(parsed.data.currentPassword, user.password);
  if (!valid) return apiError("La contraseña actual es incorrecta", 400);

  const hashed = await hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return apiOk({ ok: true });
}
