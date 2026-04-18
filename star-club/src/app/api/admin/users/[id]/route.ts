import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().max(20).nullable().optional(),
  emergencyContact: z.string().max(100).nullable().optional(),
  eps: z.string().max(100).nullable().optional(),
  branch: z.string().max(200).nullable().optional(),
  role: z.enum(["ADMIN", "COACH"]).optional(),
  coachCategoryId: z.string().nullable().optional(),
  coachCategoryIds: z.string().optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, clubId: true,
      emergencyContact: true, eps: true, branch: true, createdAt: true,
      _count: { select: { coachSessions: true } },
    },
  });
  if (!user || user.clubId !== clubId) return apiError("Not found", 404);
  return apiOk(user);
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  if (id === session.user.id) return apiError("No puedes modificar tu propia cuenta aquí", 400);

  const target = await db.user.findUnique({ where: { id }, select: { clubId: true } });
  if (!target || target.clubId !== clubId) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { password, ...rest } = parsed.data;

  const data: Record<string, unknown> = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.email !== undefined) {
    const existing = await db.user.findFirst({ where: { email: rest.email, clubId, NOT: { id } } });
    if (existing) return apiError("Email ya en uso", 409);
    data.email = rest.email;
  }
  if (rest.phone !== undefined) data.phone = rest.phone;
  if (rest.emergencyContact !== undefined) data.emergencyContact = rest.emergencyContact;
  if (rest.eps !== undefined) data.eps = rest.eps;
  if (rest.branch !== undefined) data.branch = rest.branch;
  if (rest.role !== undefined) data.role = rest.role;
  if (rest.coachCategoryId !== undefined) data.coachCategoryId = rest.coachCategoryId;
  if (rest.coachCategoryIds !== undefined) data.coachCategoryIds = rest.coachCategoryIds;
  if (password !== undefined) data.password = await hash(password, 12);

  const updated = await db.user.update({ where: { id }, data });
  return apiOk({ ok: true, id: updated.id });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  if (id === session.user.id) return apiError("No puedes eliminar tu propia cuenta", 400);

  const target = await db.user.findUnique({ where: { id }, select: { clubId: true } });
  if (!target || target.clubId !== clubId) return apiError("Not found", 404);

  await db.user.delete({ where: { id } });
  return apiOk({ ok: true });
}
