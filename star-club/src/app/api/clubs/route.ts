import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { apiError, apiOk, rateLimit, getClientIp } from "@/lib/api";

const createClubSchema = z.object({
  accessCode: z.string().min(1),
  clubName:   z.string().min(2).max(80),
  sport:      z.string().max(40).default("FOOTBALL"),
  city:       z.string().max(60).optional(),
  adminName:  z.string().min(2).max(100),
  adminEmail: z.string().email(),
  password:   z.string().min(8).max(72),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 0;
  while (await db.club.findUnique({ where: { slug: candidate } })) {
    i++;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`create-club:${ip}`, 5, 60 * 60_000)) {
    return apiError("Demasiados intentos. Espera un momento.", 429);
  }

  const body = await req.json();
  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { accessCode, clubName, sport, city, adminName, adminEmail, password } = parsed.data;

  // Validate access code
  const codeEntry = await db.accessCode.findUnique({
    where: { code: accessCode.toUpperCase().trim() },
  });

  if (!codeEntry) return apiError("Código de acceso inválido.", 403);
  if (codeEntry.usedAt) return apiError("Este código ya fue utilizado.", 403);
  if (codeEntry.expiresAt && codeEntry.expiresAt < new Date()) {
    return apiError("Este código de acceso ha expirado.", 403);
  }

  // Check email not already taken (across all clubs)
  const existing = await db.user.findFirst({ where: { email: adminEmail } });
  if (existing) return apiError("Ya existe una cuenta con ese email.", 409);

  const slug = await uniqueSlug(slugify(clubName));
  const passwordHash = await hash(password, 12);

  // Create club + admin + mark code as used — all in one transaction
  const result = await db.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name:    clubName,
        slug,
        sport,
        plan:    codeEntry.plan,
        city:    city ?? null,
        country: "CO",
      },
    });

    await tx.user.create({
      data: {
        clubId:   club.id,
        name:     adminName,
        email:    adminEmail,
        password: passwordHash,
        role:     "ADMIN",
      },
    });

    await tx.accessCode.update({
      where: { id: codeEntry.id },
      data:  { usedAt: new Date(), usedByClubId: club.id },
    });

    return { club };
  });

  return apiOk({
    clubId:   result.club.id,
    slug:     result.club.slug,
    plan:     codeEntry.plan,
    loginUrl: `/${result.club.slug}`,
  }, 201);
}
