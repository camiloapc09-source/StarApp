import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  userId: z.string(),
  resetToDocument: z.boolean().optional(), // if true, use documentNumber as new password
});

// POST /api/admin/players/reset-password
// Resets password for a player or parent account
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { userId, resetToDocument } = parsed.data;

  // Verify the user belongs to this club
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, clubId: true, role: true,
      documentNumber: true,
      playerProfile: { select: { documentNumber: true } },
      parentProfile: {
        select: {
          children: {
            take: 1,
            select: { player: { select: { documentNumber: true, user: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  if (!user || user.clubId !== clubId) return apiError("Usuario no encontrado", 404);
  if (user.role === "ADMIN") return apiError("No puedes resetear la contraseña de otro admin", 403);

  let newPassword: string;
  let resetInfo = "";

  if (resetToDocument) {
    let doc: string | null | undefined;

    if (user.role === "PARENT") {
      // Para padres: usar el documento del primer hijo vinculado
      doc = user.parentProfile?.children[0]?.player?.documentNumber;
      const childName = user.parentProfile?.children[0]?.player?.user?.name ?? "su hijo/a";
      resetInfo = doc ? ` (documento de ${childName})` : "";
    } else {
      // Para jugadores: documento en su perfil de jugador
      // Para coaches: documentNumber directo en User
      doc = user.playerProfile?.documentNumber ?? user.documentNumber;
    }

    if (!doc || doc.trim().length < 4) {
      return apiError(
        user.role === "PARENT"
          ? "Este padre no tiene hijos vinculados con documento registrado."
          : "Este usuario no tiene número de documento registrado. Usa la contraseña aleatoria.",
        400
      );
    }
    newPassword = doc.trim();
  } else {
    newPassword = randomBytes(5).toString("hex"); // 10 hex chars
  }

  const hashed = await hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  await db.notification.create({
    data: {
      userId: session.user.id,
      title: "Contraseña reseteada",
      message: resetToDocument
        ? `La contraseña de ${user.name} fue reseteada al número de documento${resetInfo}.`
        : `La contraseña de ${user.name} fue reseteada. Nueva contraseña temporal: ${newPassword}`,
      type: "INFO",
    },
  });

  return apiOk({ tempPassword: newPassword, loginEmail: user.email, userName: user.name, resetToDocument: !!resetToDocument, resetInfo });
}
