import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const schema = z.object({
  newPassword: z.string().min(6),
});

// POST /api/admin/bulk-reset-parents
// Resets the password of ALL PARENT users in the club to the given value.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const hashed = await hash(parsed.data.newPassword, 12);

  const result = await db.user.updateMany({
    where: { clubId, role: "PARENT" },
    data: { password: hashed },
  });

  return apiOk({ count: result.count });
}
