import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSuperAdminEmail } from "@/lib/superadmin";
import type { Session } from "next-auth";

type AppSession = Session & { user: Session["user"] & { id: string; role: string; clubId: string } };

export function apiOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Bloquea las llamadas de un club con la suscripción suspendida. El super admin
// (StarApp) nunca queda bloqueado. Devuelve una respuesta 403 si está suspendido,
// o null si puede continuar.
async function clubSuspendedResponse(session: AppSession): Promise<NextResponse | null> {
  const email = (session.user as { email?: string }).email ?? "";
  if (isSuperAdminEmail(email)) return null;
  const clubId = (session.user as { clubId?: string }).clubId;
  if (!clubId) return null;
  try {
    const club = await db.club.findUnique({ where: { id: clubId }, select: { active: true } });
    if (club && club.active === false) {
      return apiError("Suscripción suspendida. Contacta a StarApp para reactivar el acceso.", 403);
    }
  } catch {
    // Si la DB falla, no bloqueamos por este motivo.
  }
  return null;
}

export async function requireAuth(): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const suspended = await clubSuspendedResponse(session as AppSession);
  if (suspended) return suspended;
  return session as AppSession;
}

export async function requireRole(
  roles: string[]
): Promise<AppSession | NextResponse> {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  if (!roles.includes((session.user as any).role)) return apiError("Forbidden", 403);
  const suspended = await clubSuspendedResponse(session as AppSession);
  if (suspended) return suspended;
  return session as AppSession;
}

export async function requireAdmin(): Promise<AppSession | NextResponse> {
  return requireRole(["ADMIN"]);
}

export function getClubId(session: AppSession): string {
  return (session.user as any).clubId as string;
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

/** Wrap a route handler with try/catch + error sanitization + logging */
type RouteCtx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx?: RouteCtx) => Promise<Response>;

export function safeHandler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      console.error(`[API Error] ${req.method} ${req.nextUrl.pathname}`, err);
      return apiError("Internal server error", 500);
    }
  };
}

// --- In-memory rate limiter ---
const RATE_WINDOWS = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of RATE_WINDOWS) {
    if (now > entry.resetAt) RATE_WINDOWS.delete(key);
  }
}, 60_000);

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = RATE_WINDOWS.get(key);

  if (!entry || now > entry.resetAt) {
    RATE_WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

/** Extract a client identifier from the request (IP or fallback) */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get the category IDs a coach is allowed to access.
 * Admins get null (= no filter, see all).
 * Coaches get their assigned categories; if none assigned, returns empty array (sees nothing).
 */
export async function getCoachCategoryFilter(session: AppSession): Promise<string[] | null> {
  if (session.user.role === "ADMIN") return null; // admin sees all

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { coachCategoryId: true, coachCategoryIds: true },
  });

  if (!user) return [];

  const ids: string[] = [];
  if (user.coachCategoryId) ids.push(user.coachCategoryId);

  try {
    const parsed = JSON.parse(user.coachCategoryIds || "[]");
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id && !ids.includes(id)) ids.push(id);
      }
    }
  } catch { /* invalid JSON */ }

  return ids;
}
