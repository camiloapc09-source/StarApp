/**
 * Teléfonos y enlaces de WhatsApp — fuente única de verdad.
 *
 * PROBLEMA QUE RESUELVE
 * ─────────────────────
 *  1. El celular vive en DOS campos distintos: `Player.phone` (lo que escribe
 *     el admin en "Nuevo jugador") y `User.phone`. El panel de cobros solo
 *     miraba `User.phone`, así que a los deportistas registrados desde el
 *     formulario del admin NO les salía el botón de WhatsApp aunque tuvieran
 *     el número guardado.
 *
 *  2. Solo se revisaba el PRIMER acudiente. Si ese no tenía celular y el
 *     segundo sí, tampoco salía el botón.
 *
 *  3. Había 5 formas distintas de armar el enlace en el código. Tres usaban
 *     `wa.me/${digits}` SIN indicativo, así que un número guardado como
 *     "3001234567" no abría el chat.
 *
 * Todo eso se resuelve con `resolveContact()` + `whatsappLink()`.
 */

import { dialCode } from "@/lib/dates";

/** Forma mínima que necesitamos de un jugador para sacarle un contacto. */
export interface ContactSource {
  phone?: string | null;
  user?: { name?: string | null; phone?: string | null } | null;
  parentLinks?: Array<{
    parent?: {
      phone?: string | null;
      relation?: string | null;
      user?: { name?: string | null; phone?: string | null } | null;
    } | null;
  } | null> | null;
}

export interface ResolvedContact {
  /** Dígitos con indicativo, listo para WhatsApp. `null` si no hay teléfono. */
  digits: string | null;
  /** Nombre de a quién le vamos a escribir (acudiente si existe, si no el deportista). */
  name: string;
  /** De dónde salió el número — útil para explicarle al admin qué falta. */
  source: "parent" | "player" | "none";
  /** Parentesco del acudiente, cuando aplica. */
  relation?: string | null;
}

/** Deja solo dígitos. */
export function digitsOnly(raw?: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  return d.length > 0 ? d : null;
}

/**
 * Normaliza un número a formato internacional (sin `+`).
 *
 * Acepta lo que sea que haya escrito el admin: "300 123 4567",
 * "+57 300 1234567", "573001234567". Todos salen como "573001234567".
 */
export function normalizePhone(raw?: string | null, country?: string | null): string | null {
  const d = digitsOnly(raw);
  if (!d) return null;

  const code = dialCode(country);

  // Ya viene con indicativo y una longitud creíble → se deja tal cual.
  if (d.startsWith(code) && d.length > code.length + 6) return d;

  // Formato local con 0 o 00 al inicio (00573001234567 / 03001234567).
  const stripped = d.replace(/^0+/, "");
  if (stripped.startsWith(code) && stripped.length > code.length + 6) return stripped;

  return `${code}${stripped}`;
}

/**
 * Busca el mejor teléfono disponible para un deportista, en orden de utilidad:
 *   1. Cualquier acudiente que tenga celular (en `Parent.phone` o en su `User.phone`)
 *   2. `Player.phone`  ← el que escribe el admin en el formulario
 *   3. `User.phone` del deportista
 *
 * Revisa TODOS los acudientes, no solo el primero.
 */
export function resolveContact(player: ContactSource, country?: string | null): ResolvedContact {
  const playerName = player.user?.name ?? "el deportista";

  for (const link of player.parentLinks ?? []) {
    const parent = link?.parent;
    if (!parent) continue;
    const phone = normalizePhone(parent.phone ?? parent.user?.phone, country);
    if (phone) {
      return {
        digits: phone,
        name: parent.user?.name ?? playerName,
        source: "parent",
        relation: parent.relation ?? null,
      };
    }
  }

  const own = normalizePhone(player.phone ?? player.user?.phone, country);
  if (own) return { digits: own, name: playerName, source: "player" };

  // Sin número: devolvemos igual el nombre del primer acudiente si lo hay,
  // para poder decirle al admin a quién le falta el dato.
  const firstParentName = (player.parentLinks ?? []).find((l) => l?.parent)?.parent?.user?.name;
  return { digits: null, name: firstParentName ?? playerName, source: "none" };
}

/** ¿Se le puede escribir por WhatsApp a este deportista? */
export function hasContact(player: ContactSource, country?: string | null): boolean {
  return resolveContact(player, country).digits !== null;
}

/**
 * Enlace de WhatsApp. Único constructor en toda la app.
 * Devuelve `null` cuando no hay teléfono, para que quien llame decida qué
 * mostrar en su lugar (en vez de esconder el botón sin explicación).
 */
export function whatsappLink(digits: string | null, message?: string): string | null {
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Atajo: resuelve el contacto y arma el enlace en un solo paso. */
export function whatsappLinkFor(
  player: ContactSource,
  message: string,
  country?: string | null,
): { href: string | null; contact: ResolvedContact } {
  const contact = resolveContact(player, country);
  return { href: whatsappLink(contact.digits, message), contact };
}

/** Formato legible para mostrar en pantalla: "+57 300 123 4567". */
export function formatPhoneDisplay(raw?: string | null, country?: string | null): string | null {
  const normalized = normalizePhone(raw, country);
  if (!normalized) return null;
  const code = dialCode(country);
  const rest = normalized.startsWith(code) ? normalized.slice(code.length) : normalized;
  const grouped = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  return `+${code} ${grouped}`;
}
