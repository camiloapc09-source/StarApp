import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { requireAdmin, getClubId, isResponse, apiOk } from "@/lib/api";

// Clave temporal uniforme para todos los acudientes sin configurar.
export const TEMP_PARENT_PASSWORD = "123456789";

// POST /api/admin/parents/bulk-reset
// Resetea la contraseña de TODOS los acudientes que aún no han configurado su
// cuenta (setupCompleted = false) a una clave temporal uniforme y los deja en
// estado de "configurar". Así pueden entrar con el documento de su hijo (o su
// correo) + la clave temporal, vincular sus otros hijos y elegir su clave real.
export async function POST() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  // Solo acudientes (PARENT) de este club que NO han configurado su cuenta.
  const targets = await db.user.findMany({
    where: { clubId, role: "PARENT", setupCompleted: false },
    select: { id: true },
  });

  if (targets.length === 0) {
    return apiOk({ reset: 0, tempPassword: TEMP_PARENT_PASSWORD });
  }

  const hashed = await hash(TEMP_PARENT_PASSWORD, 12);

  const result = await db.user.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { password: hashed, setupCompleted: false },
  });

  await db.notification.create({
    data: {
      userId: session.user.id,
      title: "Acudientes reseteados",
      message: `Se reseteó la clave de ${result.count} acudiente(s) sin configurar a la clave temporal ${TEMP_PARENT_PASSWORD}.`,
      type: "INFO",
    },
  });

  return apiOk({ reset: result.count, tempPassword: TEMP_PARENT_PASSWORD });
}
