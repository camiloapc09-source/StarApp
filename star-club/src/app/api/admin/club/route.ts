import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { requireAdmin, getClubId, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";

const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const LOGO_SIZE = 256; // px

const settingsSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  city: z.string().max(60).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sport: z.string().max(40).optional(),
  billingCycleDay: z.number().int().min(1).max(28).optional(),
  earlyPaymentDays: z.number().int().min(0).max(30).optional(),
  earlyPaymentDiscount: z.number().min(0).optional(),
  zonePrices: z
    .object({
      SUR: z.number().min(0),
      CENTRO: z.number().min(0),
      NORTE: z.number().min(0),
    })
    .optional()
    .nullable(),
});

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) return apiError("Club not found", 404);

  return apiOk(club);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const contentType = req.headers.get("content-type") ?? "";

  // Handle logo upload (multipart)
  if (contentType.includes("multipart/form-data")) {
    if (!rateLimit(`club-logo:${clubId}`, 5, 10 * 60_000)) return apiError("Too many uploads", 429);

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) return apiError("No se recibió ningún archivo", 400);
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) return apiError("Solo JPG, PNG, WEBP o SVG", 400);
    if (file.size > MAX_LOGO_SIZE) return apiError("Imagen demasiado grande (máx. 2 MB)", 400);

    const bytes = await file.arrayBuffer();
    const raw = Buffer.from(bytes);

    let buffer: Buffer;
    let filename: string;

    if (file.type === "image/svg+xml") {
      // SVG: save as-is (sharp doesn't handle SVG reliably)
      buffer = raw;
      filename = `logo-${randomBytes(12).toString("hex")}.svg`;
    } else {
      buffer = await sharp(raw)
        .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toBuffer();
      filename = `logo-${randomBytes(12).toString("hex")}.webp`;
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "logos");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    const logoUrl = `/uploads/logos/${filename}`;
    const club = await db.club.update({ where: { id: clubId }, data: { logo: logoUrl } });
    return apiOk({ logo: club.logo });
  }

  // Handle JSON settings update
  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { zonePrices, ...rest } = parsed.data;

  const club = await db.club.update({
    where: { id: clubId },
    data: {
      ...rest,
      ...(zonePrices !== undefined && { zonePrices: zonePrices ?? undefined }),
    },
  });

  return apiOk(club);
}
