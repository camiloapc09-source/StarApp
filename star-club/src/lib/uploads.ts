import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

/**
 * Guardado de comprobantes en el disco persistente.
 *
 * EL PROBLEMA QUE RESUELVE
 * ────────────────────────
 * Los comprobantes de pago y de rifas se guardaban DENTRO de la base de datos,
 * como data URL en base64:
 *
 *     const base64 = Buffer.from(bytes).toString("base64");
 *     await db.payment.update({ data: { proofUrl: `data:${type};base64,${base64}` } });
 *
 * Base64 infla un 33%, así que una foto de 5 MB ocupaba ~6,7 MB de texto en una
 * columna de Postgres. Y la pantalla de cobros hacía `select: { proofUrl: true }`
 * sobre TODOS los pagos del club, sin filtro de fecha ni límite: cada carga
 * descargaba de Neon el historial completo de comprobantes.
 *
 * Se pagaba tres veces: egreso Neon → Render, egreso Render → navegador, y al ir
 * incrustado en el HTML no se podía cachear, así que se retransmitía entero.
 *
 * Las evidencias y los avatares ya lo hacían bien (disco + ruta en la base);
 * solo los comprobantes quedaron con el patrón caro. Esto los alinea.
 *
 * Además se recomprime con sharp: un comprobante es una foto de pantalla o de
 * una transferencia, no necesita 5 MB. Bajan a decenas de KB.
 */

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB de entrada
const MAX_DIMENSION = 1600;             // suficiente para leer un comprobante

/** Carpeta pública donde vive el disco persistente de Render. */
const UPLOADS_ROOT = join(process.cwd(), "public", "uploads");

export interface SaveResult {
  /** Ruta pública servible, para guardar en la base: `/uploads/proofs/xxx.webp`. */
  url: string;
  /** Tamaño final en bytes, ya comprimido. */
  size: number;
}

export class UploadError extends Error {}

/**
 * Valida, recomprime y guarda una imagen de comprobante en disco.
 *
 * @param folder Subcarpeta bajo `/uploads` (por ejemplo "proofs" o "raffles").
 */
export async function saveProofImage(file: File, folder: string): Promise<SaveResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadError("Solo se permiten imágenes (JPG, PNG o WEBP)");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("Imagen demasiado grande (máx. 5 MB)");
  }

  const raw = Buffer.from(await file.arrayBuffer());

  // sharp recodifica la imagen desde cero. Eso comprime, y de paso descarta
  // cualquier contenido que venga escondido en los metadatos del archivo.
  let output: Buffer;
  try {
    output = await sharp(raw)
      .rotate() // respeta la orientación EXIF antes de descartarla
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new UploadError("No se pudo procesar la imagen. Intenta con otra.");
  }

  const dir = join(UPLOADS_ROOT, folder);
  await mkdir(dir, { recursive: true });

  // Nombre aleatorio: no se puede adivinar ni enumerar a partir de un id.
  const filename = `${randomBytes(16).toString("hex")}.webp`;
  await writeFile(join(dir, filename), output);

  return { url: `/uploads/${folder}/${filename}`, size: output.length };
}

/**
 * Borra un comprobante anterior al reemplazarlo, para no dejar basura en el
 * disco de 1 GB. Silencioso: que falle el borrado nunca debe tumbar la subida.
 *
 * Solo acepta rutas propias (`/uploads/...`); un data URL viejo o cualquier
 * otra cosa se ignora.
 */
export async function deleteProofImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith("/uploads/")) return;
  // Sin `..` ni rutas absolutas: el nombre siempre lo generamos nosotros.
  if (url.includes("..")) return;
  try {
    await unlink(join(process.cwd(), "public", url.replace(/^\/+/, "")));
  } catch {
    // Ya no existía, o el disco no está montado. No es motivo de error.
  }
}
