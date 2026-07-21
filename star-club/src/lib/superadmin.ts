import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import type { Session } from "next-auth";

type AppSession = Session & { user: Session["user"] & { email: string } };

// Super admins fijos (respaldo si SUPERADMIN_EMAIL no está configurado en el
// entorno). No es un secreto: solo identifica qué cuenta puede entrar a
// /superadmin — el acceso igual requiere la contraseña de esa cuenta.
const DEFAULT_SUPERADMINS = ["admin@starclub.com"];

/** Lista de emails autorizados (env var + respaldo fijo), en minúsculas. */
function allowedSuperAdmins(): string[] {
  const fromEnv = (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_SUPERADMINS.map((e) => e.toLowerCase()), ...fromEnv])];
}

/** Returns the session if the user is the superadmin, otherwise a 403 response */
export async function requireSuperAdmin(): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const userEmail = (session.user as { email?: string }).email ?? "";
  if (!allowedSuperAdmins().includes(userEmail.toLowerCase())) {
    return apiError("Forbidden", 403);
  }

  return session as AppSession;
}

export function isSuperAdminEmail(email: string): boolean {
  return allowedSuperAdmins().includes(email.toLowerCase());
}
