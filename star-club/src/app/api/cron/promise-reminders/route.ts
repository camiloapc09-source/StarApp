import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/api";
import { runPromiseReminders } from "@/lib/payment-promises";

/**
 * POST /api/cron/promise-reminders
 * Corre cada mañana (9 a. m. Colombia) y recuerda las promesas de pago de HOY.
 * Autorización igual que `daily-reset`: Bearer CRON_SECRET o sesión ADMIN.
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) return apiError("Forbidden", 403);
  const result = await runPromiseReminders(null);
  return apiOk({ ok: true, ...result, ranAt: new Date().toISOString() });
}
