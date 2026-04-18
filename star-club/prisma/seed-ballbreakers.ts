/**
 * Seed Ballbreakers volleyball club
 * Run: npx tsx prisma/seed-ballbreakers.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as never);
}

const db = createClient();
const CLUB_ID = "club-ballbreakers";

async function main() {
  console.log("🏐 Seeding Ballbreakers...\n");

  // ── Club ──────────────────────────────────────────────────────────────────
  await db.club.upsert({
    where: { id: CLUB_ID },
    update: {
      billingCycleDay: 15,
      earlyPaymentDays: 5,
      earlyPaymentDiscount: 10000,
      zonePrices: { SUR: 80000, CENTRO: 90000, NORTE: 100000 },
    },
    create: {
      id: CLUB_ID,
      name: "Ballbreakers",
      slug: "ballbreakers",
      email: "admin@ballbreakers.com",
      sport: "VOLLEYBALL",
      country: "CO",
      city: "Colombia",
      billingCycleDay: 15,
      earlyPaymentDays: 5,
      earlyPaymentDiscount: 10000,
      zonePrices: { SUR: 80000, CENTRO: 90000, NORTE: 100000 },
    },
  });
  console.log("✅ Club: Ballbreakers");

  // ── Categories ────────────────────────────────────────────────────────────
  const cats = [
    { id: "bb-benjamin",  name: "Benjamín",   ageMin: 0,  ageMax: 8  },
    { id: "bb-baby",      name: "Baby Vóley", ageMin: 9,  ageMax: 10 },
    { id: "bb-mini",      name: "Mini Vóley", ageMin: 11, ageMax: 12 },
    { id: "bb-infantil",  name: "Infantil",   ageMin: 13, ageMax: 15 },
    { id: "bb-menores",   name: "Menores",    ageMin: 16, ageMax: 17 },
    { id: "bb-juveniles", name: "Juveniles",  ageMin: 18, ageMax: 19 },
  ];

  for (const c of cats) {
    await db.category.upsert({
      where: { name_clubId: { name: c.name, clubId: CLUB_ID } },
      update: {},
      create: { id: c.id, clubId: CLUB_ID, name: c.name, ageMin: c.ageMin, ageMax: c.ageMax },
    });
  }
  console.log(`✅ ${cats.length} categorías`);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const pwd = await hash("admin123", 12);
  const existing = await db.user.findFirst({ where: { email: "admin@ballbreakers.com" } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { password: pwd, clubId: CLUB_ID } });
  } else {
    await db.user.create({
      data: { name: "Admin Ballbreakers", email: "admin@ballbreakers.com", password: pwd, role: "ADMIN", clubId: CLUB_ID },
    });
  }
  console.log("✅ Admin: admin@ballbreakers.com / admin123");

  console.log("\n🎉 Ballbreakers listo.");
}

main().catch(console.error).finally(() => db.$disconnect());
