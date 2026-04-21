import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";
import { requireAdmin, getClubId, isResponse, apiError, apiOk } from "@/lib/api";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["COACH", "ADMIN"]).default("COACH"),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  eps: z.string().optional(),
  branch: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const existing = await db.user.findFirst({ where: { email: parsed.data.email, clubId } });
  if (existing) return apiError("Email already in use", 400);

  // Plan enforcement — coach limit
  if (parsed.data.role === "COACH") {
    const { getLimits } = await import("@/lib/plans");
    const club = await db.club.findUnique({ where: { id: clubId }, select: { plan: true } });
    const limits = getLimits(club?.plan ?? "STARTER");
    if (limits.maxCoaches !== Infinity) {
      const coachCount = await db.user.count({ where: { clubId, role: "COACH" } });
      if (coachCount >= limits.maxCoaches) {
        return apiError(
          `Tu plan ${club?.plan ?? "STARTER"} permite máximo ${limits.maxCoaches} entrenadores. Actualiza a PRO para agregar más.`,
          403
        );
      }
    }
  }

  const hashed = await hash(parsed.data.password, 12);
  const user = await db.user.create({
    data: {
      clubId,
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      emergencyContact: parsed.data.emergencyContact || null,
      eps: parsed.data.eps || null,
      branch: parsed.data.branch || null,
    },
  });

  return apiOk(user, 201);
}
