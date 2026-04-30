import { requireRole, getClubId, isResponse, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST() {
  const session = await requireRole(["COACH", "ADMIN"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);
  const role   = (session.user as { role: string }).role;

  if (role === "ADMIN") {
    // Admins can always create invites
  } else {
    // Coach: club master switch must be on AND coach must have individual permission
    const [club, coach] = await Promise.all([
      db.club.findUnique({ where: { id: clubId }, select: { coachCanInvite: true } }),
      db.user.findUnique({ where: { id: session.user.id }, select: { canInvite: true } }),
    ]);

    if (!club?.coachCanInvite) {
      return apiError("Tu administrador no ha habilitado esta función para el club", 403);
    }
    if (!coach?.canInvite) {
      return apiError("No tienes permiso para crear invitaciones. Contacta a tu administrador", 403);
    }
  }

  const code = generateCode(8);
  const invite = await db.invite.create({
    data: { clubId, code, role: "PLAYER", createdBy: session.user.id },
  });

  return apiOk(invite, 201);
}
