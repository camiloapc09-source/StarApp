import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { requireAuth, getClubId, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const AVATAR_SIZE = 400; // px max width/height

// POST /api/profile/avatar — player uploads a pending profile photo
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  if (!rateLimit(`avatar:${session.user.id}`, 3, 5 * 60_000)) return apiError("Too many uploads", 429);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No se recibió ninguna imagen", 400);

  if (!ALLOWED_TYPES.includes(file.type)) return apiError("Solo se permiten imágenes JPG, PNG o WEBP", 400);
  if (file.size > MAX_SIZE) return apiError("Imagen demasiado grande (máx. 5 MB)", 400);

  const bytes = await file.arrayBuffer();
  const raw = Buffer.from(bytes);

  const buffer = await sharp(raw)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  // Use a random token instead of userId to prevent filename enumeration
  const token = randomBytes(16).toString("hex");
  const filename = `ap-${token}.webp`; // ap = avatar-pending

  const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  const url = `/uploads/avatars/${filename}`;

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarPending: url, avatarStatus: "PENDING" },
  });

  const admins = await db.user.findMany({ where: { clubId, role: "ADMIN" }, select: { id: true } });
  if (admins.length > 0) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Foto de perfil pendiente 📷",
        message: `${user?.name ?? "Un usuario"} subió una foto de perfil que requiere tu aprobación.`,
        type: "INFO",
        link: "/dashboard/admin/players",
      })),
    });
  }

  return apiOk({ url });
}
