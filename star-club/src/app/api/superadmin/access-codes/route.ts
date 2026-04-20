import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireSuperAdmin } from "@/lib/superadmin";
import { apiError, apiOk, isResponse } from "@/lib/api";

const PLANS = ["STARTER", "PRO", "ENTERPRISE"] as const;

const createSchema = z.object({
  plan:      z.enum(PLANS).default("STARTER"),
  notes:     z.string().max(300).optional(),
  expiresAt: z.string().optional(), // ISO date string
  quantity:  z.number().int().min(1).max(50).default(1),
});

function generateCode(): string {
  // Format: XXXX-XXXX-XXXX (uppercase alphanumeric, no ambiguous chars)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export async function GET(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (isResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all"; // all | unused | used

  const codes = await db.accessCode.findMany({
    where: filter === "unused"
      ? { usedAt: null }
      : filter === "used"
        ? { usedAt: { not: null } }
        : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return apiOk(codes);
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (isResponse(session)) return session;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { plan, notes, expiresAt, quantity } = parsed.data;

  const data = Array.from({ length: quantity }, () => ({
    code:      generateCode(),
    plan,
    notes:     notes ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }));

  await db.accessCode.createMany({ data });

  // Return the created codes
  const codes = await db.accessCode.findMany({
    where: { code: { in: data.map((d) => d.code) } },
    orderBy: { createdAt: "desc" },
  });

  return apiOk(codes, 201);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (isResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Missing id", 400);

  const code = await db.accessCode.findUnique({ where: { id } });
  if (!code) return apiError("Not found", 404);
  if (code.usedAt) return apiError("No se puede eliminar un código ya usado", 409);

  await db.accessCode.delete({ where: { id } });
  return apiOk({ ok: true });
}
