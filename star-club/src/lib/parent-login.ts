/**
 * Acceso de acudientes con celular + documento del hijo.
 *
 *   Usuario:     el celular registrado del acudiente
 *   Contraseña:  el documento de CUALQUIERA de sus hijos (mientras
 *                `User.childDocLogin` sea true) o la clave que él haya elegido.
 *
 * El celular vive en tres sitios (`User.phone`, `Parent.phone` y, cuando el
 * admin lo escribió ahí, `Player.phone` del hijo) y guardado con formatos
 * distintos ("300 123 4567", "+57300…"), así que se compara solo por dígitos
 * y sin el indicativo del país.
 */

import { db } from "@/lib/db";
import { dialCode } from "@/lib/dates";
import { digitsOnly } from "@/lib/phone";

/** Tope de cuentas a probar por intento (cada una cuesta un bcrypt). */
const MAX_CANDIDATES = 5;

/**
 * Número nacional (sin indicativo) si el texto parece un celular; si no, null.
 * "+57 300 123 4567" → "3001234567".
 */
export function nationalPhone(input: string, country?: string | null): string | null {
  if (/[^\d\s+()-]/.test(input)) return null; // tiene letras o "@": no es un celular
  const d = digitsOnly(input)?.replace(/^0+/, "");
  if (!d) return null;
  const code = dialCode(country);
  const national = d.startsWith(code) && d.length > code.length + 6 ? d.slice(code.length) : d;
  return national.length >= 7 ? national : null;
}

/**
 * IDs de acudientes del club cuyo celular coincide. Primero se buscan los
 * celulares del propio acudiente; el del deportista solo se usa si ningún
 * acudiente tiene ese número.
 */
export async function findParentIdsByPhone(clubId: string, national: string): Promise<string[]> {
  const byParent = await db.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT u.id
    FROM "User" u
    LEFT JOIN "Parent" p ON p."userId" = u.id
    WHERE u."clubId" = ${clubId} AND u.role = 'PARENT' AND (
      right(regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g'), ${national.length}::int) = ${national} OR
      right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), ${national.length}::int) = ${national}
    )
    LIMIT ${MAX_CANDIDATES}`;
  if (byParent.length > 0) return byParent.map((r) => r.id);

  const byPlayer = await db.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "Parent" p        ON p."userId" = u.id
    JOIN "ParentPlayer" pp ON pp."parentId" = p.id
    JOIN "Player" pl       ON pl.id = pp."playerId"
    WHERE u."clubId" = ${clubId} AND u.role = 'PARENT'
      AND right(regexp_replace(coalesce(pl.phone, ''), '[^0-9]', '', 'g'), ${national.length}::int) = ${national}
    LIMIT ${MAX_CANDIDATES}`;
  return byPlayer.map((r) => r.id);
}

/** ¿La clave escrita es el documento de alguno de los hijos de este acudiente? */
export async function isChildDocument(userId: string, password: string): Promise<boolean> {
  const doc = password.replace(/[\s.,-]/g, "");
  if (doc.length < 4) return false;
  const children = await db.parentPlayer.findMany({
    where: { parent: { userId } },
    select: { player: { select: { documentNumber: true } } },
  });
  return children.some((c) => c.player.documentNumber?.replace(/[\s.,-]/g, "") === doc);
}
