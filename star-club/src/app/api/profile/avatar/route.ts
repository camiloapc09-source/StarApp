import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// POST /api/profile/avatar — player uploads a pending profile photo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WEBP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 5 MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = extname(file.name).toLowerCase() || ".jpg";
  const filename = `avatar-pending-${session.user.id}${ext}`;

  const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  const url = `/uploads/avatars/${filename}`;

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarPending: url, avatarStatus: "PENDING" },
  });

  // Notify admins
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
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

  return NextResponse.json({ url });
}
