import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { requireAuth, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";
import { isDocumentPassword } from "@/lib/parent-login";

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
    select: { password: true, role: true },
  });

  if (!user) return apiError("Usuario no encontrado", 404);

  // Deportistas y acudientes entran con un documento: sirve como "clave
  // actual", porque su clave guardada puede ser una temporal que nunca conocieron.
  const valid =
    (await compare(parsed.data.currentPassword, user.password)) ||
    (await isDocumentPassword({ id: session.user.id, role: user.role }, parsed.data.currentPassword));
  if (!valid) return apiError("La contraseña actual es incorrecta", 400);

  const hashed = await hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    // Eligió su propia clave: el documento del hijo deja de servir como clave.
    data: { password: hashed, childDocLogin: false },
  });

  return apiOk({ ok: true });
}
