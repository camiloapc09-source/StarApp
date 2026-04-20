import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import type { Session } from "next-auth";

type AppSession = Session & { user: Session["user"] & { email: string } };

/** Returns the session if the user is the superadmin, otherwise a 403 response */
export async function requireSuperAdmin(): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const superAdminEmail = process.env.SUPERADMIN_EMAIL ?? "";
  const userEmail = (session.user as { email?: string }).email ?? "";

  // Support comma-separated list of superadmin emails
  const allowed = superAdminEmail.split(",").map((e) => e.trim().toLowerCase());
  if (!allowed.includes(userEmail.toLowerCase())) {
    return apiError("Forbidden", 403);
  }

  return session as AppSession;
}

export function isSuperAdminEmail(email: string): boolean {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL ?? "";
  const allowed = superAdminEmail.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}
