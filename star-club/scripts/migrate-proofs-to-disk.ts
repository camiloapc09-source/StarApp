/**
 * Migra los comprobantes que están guardados DENTRO de la base de datos
 * (data URL en base64) al disco persistente, dejando en la columna solo la ruta.
 *
 * POR QUÉ
 * ───────
 * Una foto de 5 MB se guardaba como ~6,7 MB de texto en una columna de Postgres
 * (base64 infla un 33%), y la pantalla de cobros los descargaba TODOS en cada
 * carga. Eso es lo que dispara la factura de Neon.
 *
 * Las subidas nuevas ya van a disco. Esto se encarga de las viejas.
 *
 * USO
 * ───
 *   npx tsx scripts/migrate-proofs-to-disk.ts          → SIMULACIÓN, no escribe nada
 *   npx tsx scripts/migrate-proofs-to-disk.ts --apply  → aplica los cambios
 *
 * Requiere DATABASE_URL en el entorno y que el disco esté montado, así que
 * conviene correrlo en el shell de Render, no en local.
 *
 * Es seguro repetirlo: solo toca filas cuyo valor empieza por "data:".
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

// Mismo adaptador que usa la app (src/lib/db.ts): Prisma 7 lo exige.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) } as never);
const APPLY = process.argv.includes("--apply");
const UPLOADS_ROOT = join(process.cwd(), "public", "uploads");

function decodeDataUrl(dataUrl: string): Buffer | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  try {
    return Buffer.from(dataUrl.slice(comma + 1), "base64");
  } catch {
    return null;
  }
}

/** Recomprime y guarda en disco. Devuelve la ruta pública y el tamaño final. */
async function writeToDisk(buf: Buffer, folder: string) {
  const out = await sharp(buf)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const dir = join(UPLOADS_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const filename = `${randomBytes(16).toString("hex")}.webp`;
  await writeFile(join(dir, filename), out);
  return { url: `/uploads/${folder}/${filename}`, size: out.length };
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  console.log(APPLY ? "MODO REAL — se van a escribir cambios\n" : "SIMULACIÓN — no se escribe nada\n");

  let freed = 0;
  let written = 0;
  let migrated = 0;
  let failed = 0;

  // ── Comprobantes de pago ──────────────────────────────────────────────────
  const payments = await db.payment.findMany({
    where: { proofUrl: { startsWith: "data:" } },
    select: { id: true, proofUrl: true, concept: true },
  });
  console.log(`Pagos con comprobante en la base: ${payments.length}`);

  for (const p of payments) {
    const buf = p.proofUrl ? decodeDataUrl(p.proofUrl) : null;
    if (!buf) {
      console.log(`  ! ${p.id} — no se pudo decodificar, se deja como está`);
      failed++;
      continue;
    }
    const before = Buffer.byteLength(p.proofUrl!, "utf8");
    freed += before;

    if (!APPLY) {
      console.log(`  · ${p.concept.slice(0, 40).padEnd(40)} ${mb(before)} → disco`);
      migrated++;
      continue;
    }
    try {
      const saved = await writeToDisk(buf, "proofs");
      await db.payment.update({ where: { id: p.id }, data: { proofUrl: saved.url } });
      written += saved.size;
      migrated++;
      console.log(`  ✓ ${p.concept.slice(0, 40).padEnd(40)} ${mb(before)} → ${mb(saved.size)}`);
    } catch (e) {
      console.log(`  ! ${p.id} — falló: ${(e as Error).message}`);
      failed++;
    }
  }

  // ── Comprobantes de rifas ─────────────────────────────────────────────────
  const tickets = await db.raffleTicket.findMany({
    where: { proofUrl: { startsWith: "data:" } },
    select: { id: true, proofUrl: true, number: true },
  });
  console.log(`\nBoletas de rifa con comprobante en la base: ${tickets.length}`);

  for (const t of tickets) {
    const buf = t.proofUrl ? decodeDataUrl(t.proofUrl) : null;
    if (!buf) { failed++; continue; }
    const before = Buffer.byteLength(t.proofUrl!, "utf8");
    freed += before;

    if (!APPLY) {
      console.log(`  · boleta #${t.number} ${mb(before)} → disco`);
      migrated++;
      continue;
    }
    try {
      const saved = await writeToDisk(buf, "raffles");
      await db.raffleTicket.update({ where: { id: t.id }, data: { proofUrl: saved.url } });
      written += saved.size;
      migrated++;
      console.log(`  ✓ boleta #${t.number} ${mb(before)} → ${mb(saved.size)}`);
    } catch (e) {
      console.log(`  ! boleta #${t.number} — falló: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log("\n─────────────────────────────────────");
  console.log(`Comprobantes procesados : ${migrated}`);
  if (failed > 0) console.log(`Fallidos (sin tocar)    : ${failed}`);
  console.log(`Se libera de la base    : ${mb(freed)}`);
  if (APPLY) console.log(`Ocupan en disco         : ${mb(written)}`);
  if (!APPLY) {
    console.log("\nEsto fue una simulación. Para aplicarlo:");
    console.log("  npx tsx scripts/migrate-proofs-to-disk.ts --apply");
  }
}

main()
  .catch((e) => { console.error("FALLÓ:", e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
