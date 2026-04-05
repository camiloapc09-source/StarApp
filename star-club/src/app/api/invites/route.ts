import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createInviteSchema = z.object({
  role: z.enum(["PLAYER", "COACH"]).default("PLAYER"),
  payload: z.any().optional(),
  expiresAt: z.string().optional(),
});

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Allow public lookup by code (used by public registration flow)
  if (code) {
    const invite = await db.invite.findUnique({ where: { code } });
    return NextResponse.json(invite);
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await db.invite.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  // Only ADMIN can generate invites
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const code = generateCode(8);
  const invite = await db.invite.create({
    data: {
      code,
      role: parsed.data.role || "PLAYER",
      payload: parsed.data.payload || null,
      createdBy: session.user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  await db.invite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
