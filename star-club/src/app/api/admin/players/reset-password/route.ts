import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({ userId: z.string() });

// POST /api/admin/players/reset-password
// Generates a new temp password for a player or parent account
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { userId } = parsed.data;

  // Verify the user belongs to this club
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, clubId: true, role: true },
  });

  if (!user || user.clubId !== clubId) return apiError("Usuario no encontrado", 404);
  if (user.role === "ADMIN") return apiError("No puedes resetear la contraseña de otro admin", 403);

  const tempPassword = randomBytes(5).toString("hex"); // 10 hex chars
  const hashed = await hash(tempPassword, 12);

  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  // Notify the admin who did it
  await db.notification.create({
    data: {
      userId: session.user.id,
      title:  "Contraseña reseteada",
      message: `La contraseña de ${user.name} fue reseteada. Nueva contraseña temporal: ${tempPassword}`,
      type:   "INFO",
    },
  });

  return apiOk({ tempPassword, loginEmail: user.email, userName: user.name });
}
