import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { apiError, apiOk } from "@/lib/api";

const schema = z.object({
  email:    z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// PATCH /api/parent/setup
// Called by parents with @bb.internal accounts to set their real email + password
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    return apiError("No autorizado", 401);
  }

  const currentEmail = session.user.email ?? "";
  if (!currentEmail.endsWith(".internal")) {
    return apiError("Tu cuenta ya está configurada", 400);
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { email, password } = parsed.data;
  const userId = (session.user as { id?: string }).id;
  if (!userId) return apiError("Sesión inválida", 401);

  const clubId = (session.user as { clubId?: string }).clubId;

  // Check the new email is not taken by another user in this club
  const existing = await db.user.findFirst({
    where: { email, clubId, NOT: { id: userId } },
  });
  if (existing) return apiError("Este correo ya está en uso en tu club", 409);

  const hashed = await hash(password, 12);
  await db.user.update({
    where: { id: userId },
    data: { email, password: hashed },
  });

  return apiOk({ ok: true });
}
