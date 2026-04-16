import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

/**
 * POST /api/admin/bootstrap
 * One-time admin password recovery, secured by ADMIN_BOOTSTRAP_SECRET env var.
 * Body: { secret: string, password: string }
 * Only works if ADMIN_BOOTSTRAP_SECRET is set in environment variables.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Not available" }, { status: 404 });
    }

    const body = await req.json();
    if (!body.secret || body.secret !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!body.password || typeof body.password !== "string" || body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) {
      return NextResponse.json({ error: "No admin account found" }, { status: 404 });
    }

    const hashed = await hash(body.password, 12);
    await db.user.update({ where: { id: admin.id }, data: { password: hashed } });

    return NextResponse.json({ ok: true, email: admin.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
