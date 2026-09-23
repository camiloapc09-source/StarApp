import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import type { Session } from "next-auth";

type AppSession = Session & { user: Session["user"] & { email: string } };

/**
 * Acceso al panel /superadmin (toda la plataforma, todos los clubes).
 *
 * EL HUECO QUE CIERRA
 * ───────────────────
 * Antes bastaba con que el email coincidiera:
 *
 *     if (!allowedSuperAdmins().includes(userEmail)) return 403;
 *
 * Pero los emails NO son únicos globalmente — son únicos por club
 * (`@@unique([email, clubId])`), y todas las altas validan dentro del club:
 *
 *     db.user.findFirst({ where: { email, clubId } })   // players, invites, users
 *
 * Es decir: cualquiera capaz de crear un usuario en CUALQUIER club —un admin
 * de club, o cualquier persona con un código de invitación— podía registrar
 * una cuenta con el email del superadmin en su propio club, entrar con ella y
 * quedar con acceso a todos los clubes y todos los datos.
 *
 * AHORA
 * ─────
 * Dos caminos, y el email por sí solo ya no alcanza:
 *
 *  1. `User.isSuperAdmin = true` — marca explícita en la fila. El camino
 *     principal; no depende de cadenas ni de variables de entorno.
 *
 *  2. Respaldo por email, pero exigiendo ADEMÁS que la cuenta viva en el club
 *     de la plataforma Y tenga rol ADMIN. Se conserva para no dejar a nadie
 *     fuera si la marca todavía no está puesta.
 *
 * La comprobación consulta la base en vez de confiar en el JWT: la sesión se
 * emite al iniciar sesión y podría quedar obsoleta si se revoca el acceso.
 */

/** Club dueño de la plataforma. Solo ahí puede vivir un superadmin de respaldo. */
const PLATFORM_CLUB_ID = process.env.SUPERADMIN_CLUB_ID ?? "club-star";

/**
 * Emails de respaldo. No es un secreto: solo dice qué cuenta PUEDE entrar, y
 * el acceso sigue exigiendo la contraseña de esa cuenta, el club correcto y
 * el rol ADMIN.
 */
const DEFAULT_SUPERADMINS = ["admin@starclub.com"];

/** Lista de emails autorizados (variable de entorno + respaldo fijo), en minúsculas. */
function allowedSuperAdminEmails(): string[] {
  const fromEnv = (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_SUPERADMINS.map((e) => e.toLowerCase()), ...fromEnv])];
}

/**
 * Resuelve si un usuario concreto es superadmin, leyendo su fila real.
 * Recibe el id —no el email— porque el id sí es único en toda la plataforma.
 */
export async function isSuperAdminUser(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, clubId: true, role: true, isSuperAdmin: true },
  });
  if (!user) return false;

  // Camino principal: marca explícita.
  if (user.isSuperAdmin) return true;

  // Respaldo: email autorizado + club de la plataforma + rol ADMIN.
  // Las tres condiciones juntas; el email solo nunca alcanza.
  return (
    user.clubId === PLATFORM_CLUB_ID &&
    user.role === "ADMIN" &&
    allowedSuperAdminEmails().includes(user.email.toLowerCase())
  );
}

/** Devuelve la sesión si el usuario es superadmin; si no, una respuesta 401/403. */
export async function requireSuperAdmin(): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const userId = (session.user as { id?: string }).id;
  if (!userId) return apiError("Unauthorized", 401);

  if (!(await isSuperAdminUser(userId))) return apiError("Forbidden", 403);

  return session as AppSession;
}

/**
 * Versión sin base de datos, para decidir si se MUESTRA el enlace al panel.
 *
 * Es solo cosmética: quien llegue igual al panel pasa por `requireSuperAdmin`,
 * que sí valida contra la base. Nunca la uses para autorizar.
 */
export function mightBeSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedSuperAdminEmails().includes(email.toLowerCase());
}
