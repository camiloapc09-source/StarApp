import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const createInviteSchema = z.object({
  role: z.enum(["PLAYER", "COACH"]).default("PLAYER"),
  payload: z.any().optional(),
  expiresAt: z.string().optional(),
});

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Public lookup by code (used by registration flow) — return minimal data
  if (code) {
    const invite = await db.invite.findUnique({
      where: { code },
      select: { id: true, code: true, role: true, used: true, expiresAt: true, clubId: true, club: { select: { name: true, slug: true, logo: true, zonePrices: true } } },
    });
    if (!invite) return apiOk(null);
    // Get distinct coach branches for this club (used as sede options in registration)
    const coachBranches = await db.user.findMany({
      where: { clubId: invite.clubId, role: "COACH", branch: { not: null } },
      select: { branch: true },
      distinct: ["branch"],
    });
    const branches = coachBranches.map((c) => c.branch!).sort();
    const { clubId: _cid, ...rest } = invite;
    return apiOk({ ...rest, branches });
  }

  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const invites = await db.invite.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return apiOk(invites);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const code = generateCode(8);
  const invite = await db.invite.create({
    data: {
      clubId,
      code,
      role: parsed.data.role || "PLAYER",
      payload: parsed.data.payload || null,
      createdBy: session.user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  return apiOk(invite, 201);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id requerido", 400);

  const invite = await db.invite.findUnique({ where: { id }, select: { clubId: true } });
  if (!invite || invite.clubId !== clubId) return apiError("Not found", 404);

  await db.invite.delete({ where: { id } });
  return apiOk({ ok: true });
}
