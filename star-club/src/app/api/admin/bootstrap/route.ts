import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { apiError, apiOk, rateLimit, getClientIp } from "@/lib/api";

/**
 * POST /api/admin/bootstrap
 * One-time admin password recovery, secured by ADMIN_BOOTSTRAP_SECRET env var.
 * Body: { secret: string, password: string }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`bootstrap:${ip}`, 3, 60_000)) return apiError("Too many requests", 429);

  try {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret) return apiError("Not available", 404);

    const body = await req.json();
    if (!body.secret || body.secret !== secret) return apiError("Forbidden", 403);

    if (!body.password || typeof body.password !== "string" || body.password.length < 6) {
      return apiError("Password must be at least 6 characters", 400);
    }

    const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) return apiError("No admin account found", 404);

    const hashed = await hash(body.password, 12);
    await db.user.update({ where: { id: admin.id }, data: { password: hashed } });

    return apiOk({ ok: true, email: admin.email });
  } catch {
    return apiError("Internal server error", 500);
  }
}
