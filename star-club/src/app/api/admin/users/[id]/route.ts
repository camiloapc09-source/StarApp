import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().max(20).nullable().optional(),
  emergencyContact: z.string().max(100).nullable().optional(),
  eps: z.string().max(100).nullable().optional(),
  branch: z.string().max(80).nullable().optional(),
  role: z.enum(["ADMIN", "COACH"]).optional(),
  coachCategoryId: z.string().nullable().optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      emergencyContact: true, eps: true, branch: true, createdAt: true,
      _count: { select: { coachSessions: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent admin from modifying their own role
  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes modificar tu propia cuenta aquí" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;

  // Build update data
  const data: Record<string, unknown> = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.email !== undefined) {
    const existing = await db.user.findFirst({ where: { email: rest.email, NOT: { id } } });
    if (existing) return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
    data.email = rest.email;
  }
  if (rest.phone !== undefined) data.phone = rest.phone;
  if (rest.emergencyContact !== undefined) data.emergencyContact = rest.emergencyContact;
  if (rest.eps !== undefined) data.eps = rest.eps;
  if (rest.branch !== undefined) data.branch = rest.branch;
  if (rest.role !== undefined) data.role = rest.role;
  if (rest.coachCategoryId !== undefined) data.coachCategoryId = rest.coachCategoryId;
  if (password !== undefined) data.password = await hash(password, 12);

  const updated = await db.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
