/**
 * Acceso con documento de identidad.
 *
 * Deportistas:  usuario y contraseña = su propio documento.
 * Acudientes:   usuario = su celular registrado; contraseña = el documento de
 *               CUALQUIERA de sus hijos. La clave guardada (si eligieron una)
 *               sigue funcionando también.
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

/** Documento sin puntos, espacios ni guiones, en minúsculas: "1.043.123-4" → "10431234". */
export function normalizeDocument(input: string | null | undefined): string {
  return (input ?? "").replace(/[\s.,-]/g, "").toLowerCase();
}

/**
 * IDs de deportistas cuyo documento coincide con lo escrito como usuario.
 * Sin club (login global) se busca en todos; por eso el tope.
 */
export async function findPlayerIdsByDocument(input: string, clubId?: string): Promise<string[]> {
  const doc = normalizeDocument(input);
  if (doc.length < 4) return [];
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id
    FROM "User" u
    JOIN "Player" pl ON pl."userId" = u.id
    WHERE u.role = 'PLAYER'
      AND (${clubId ?? null}::text IS NULL OR u."clubId" = ${clubId ?? null})
      AND lower(regexp_replace(coalesce(pl."documentNumber", ''), '[[:space:].,-]', '', 'g')) = ${doc}
    LIMIT ${MAX_CANDIDATES}`;
  return rows.map((r) => r.id);
}

/** ¿La clave escrita es el documento del propio deportista? */
export async function isOwnDocument(userId: string, password: string): Promise<boolean> {
  const doc = normalizeDocument(password);
  if (doc.length < 4) return false;
  const player = await db.player.findUnique({ where: { userId }, select: { documentNumber: true } });
  return normalizeDocument(player?.documentNumber) === doc;
}

/** ¿La clave escrita es el documento de alguno de los hijos de este acudiente? */
export async function isChildDocument(userId: string, password: string): Promise<boolean> {
  const doc = normalizeDocument(password);
  if (doc.length < 4) return false;
  const children = await db.parentPlayer.findMany({
    where: { parent: { userId } },
    select: { player: { select: { documentNumber: true } } },
  });
  return children.some((c) => normalizeDocument(c.player.documentNumber) === doc);
}

/** El documento siempre sirve como clave: el propio (deportista) o el de un hijo (acudiente). */
export async function isDocumentPassword(user: { id: string; role: string }, password: string): Promise<boolean> {
  if (user.role === "PLAYER") return isOwnDocument(user.id, password);
  if (user.role === "PARENT") return isChildDocument(user.id, password);
  return false;
}
