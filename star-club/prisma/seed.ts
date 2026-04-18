import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN ?? "",
    });
    return new PrismaClient({ adapter } as never);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  return new PrismaClient({ adapter } as never);
}

const prisma = createPrismaClient();

const STAR_CLUB_ID = "club-star";

/**
 * Production seed - safe to re-run at ANY time.
 * Only upserts static base data. NEVER deletes existing data.
 */
async function main() {
  console.log("🌱 Seeding Star Club (production-safe)...\n");

  // ── SQL migrations (idempotent) ────────────────────────────────────────────
  const migrations: [string, string][] = [
    ["coachCategoryIds on User",  `ALTER TABLE "User" ADD COLUMN "coachCategoryIds" TEXT NOT NULL DEFAULT '[]'`],
    ["clubId on Club (create)",   `CREATE TABLE IF NOT EXISTS "Club" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "email" TEXT, "logo" TEXT, "sport" TEXT NOT NULL DEFAULT 'BASKETBALL', "country" TEXT NOT NULL DEFAULT 'CO', "city" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`],
    ["slug unique on Club",       `CREATE UNIQUE INDEX IF NOT EXISTS "Club_slug_key" ON "Club"("slug")`],
    ["clubId on User",            `ALTER TABLE "User" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Category",        `ALTER TABLE "Category" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Player",          `ALTER TABLE "Player" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Session",         `ALTER TABLE "Session" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Payment",         `ALTER TABLE "Payment" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Mission",         `ALTER TABLE "Mission" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Reward",          `ALTER TABLE "Reward" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
    ["clubId on Invite",          `ALTER TABLE "Invite" ADD COLUMN "clubId" TEXT NOT NULL DEFAULT 'club-star'`],
  ];

  for (const [label, sql] of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Migration: ${label}`);
    } catch {
      // Column/table already exists — safe to ignore
    }
  }

  // ── Remove old unique index on Category.name (replaced by composite) ───────
  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Category_name_key"`);
    console.log("✅ Migration: dropped Category_name_key unique index");
  } catch {
    // ignore
  }

  // ── Remove old unique index on User.email (replaced by composite) ──────────
  // NOTE: We keep User.email unique PER CLUB, but SQLite doesn't support
  // partial indexes easily, so we keep the original email unique for now
  // and enforce uniqueness at app level for multi-club scenarios.

  // ── Star Club ──────────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    INSERT OR IGNORE INTO "Club" ("id","name","slug","email","sport","country","city","createdAt","updatedAt")
    VALUES ('club-star','Star Club','star-club','admin@starclub.com','BASKETBALL','CO','Colombia',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
  `);
  console.log("✅ Club: Star Club (id=club-star)");

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name_clubId: { name: "U-12", clubId: STAR_CLUB_ID } },
      update: {},
      create: { id: "cat-u12", clubId: STAR_CLUB_ID, name: "U-12", description: "Menores de 12 años", ageMin: 8,  ageMax: 12 },
    }),
    prisma.category.upsert({
      where: { name_clubId: { name: "U-15", clubId: STAR_CLUB_ID } },
      update: {},
      create: { id: "cat-u15", clubId: STAR_CLUB_ID, name: "U-15", description: "Menores de 15 años", ageMin: 12, ageMax: 15 },
    }),
    prisma.category.upsert({
      where: { name_clubId: { name: "U-18", clubId: STAR_CLUB_ID } },
      update: {},
      create: { id: "cat-u18", clubId: STAR_CLUB_ID, name: "U-18", description: "Menores de 18 años", ageMin: 15, ageMax: 18 },
    }),
    prisma.category.upsert({
      where: { name_clubId: { name: "Senior", clubId: STAR_CLUB_ID } },
      update: {},
      create: { id: "cat-senior", clubId: STAR_CLUB_ID, name: "Senior", description: "División adultos", ageMin: 18, ageMax: 40 },
    }),
  ]);
  console.log(`✅ ${categories.length} categorías`);

  // ── Admin account ─────────────────────────────────────────────────────────
  const adminPassword = await hash("admin123", 12);
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@starclub.com" },
  });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { password: adminPassword, clubId: STAR_CLUB_ID },
    });
  } else {
    await prisma.user.create({
      data: {
        name: "Camilo Ponton",
        email: "admin@starclub.com",
        password: adminPassword,
        role: "ADMIN",
        clubId: STAR_CLUB_ID,
      },
    });
  }
  console.log("✅ Admin: admin@starclub.com / admin123");

  // ── Missions ──────────────────────────────────────────────────────────────
  const missions = await Promise.all([
    prisma.mission.upsert({
      where: { id: "mision-abdominales" },
      update: { icon: "💪", clubId: STAR_CLUB_ID },
      create: {
        id: "mision-abdominales",
        clubId: STAR_CLUB_ID,
        title: "200 Abdominales",
        description: "Completa 200 abdominales. Puedes hacerlos en cualquier lugar: cancha, parque, casa o gym.",
        xpReward: 150,
        type: "WEEKLY",
        icon: "💪",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-5km" },
      update: { icon: "🏃", title: "Correr 5 Kilómetros", clubId: STAR_CLUB_ID },
      create: {
        id: "mision-5km",
        clubId: STAR_CLUB_ID,
        title: "Correr 5 Kilómetros",
        description: "Corre 5 kilómetros sin parar. Trota por el parque, cancha o cualquier terreno.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "🏃",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-saltos" },
      update: { icon: "⚡", clubId: STAR_CLUB_ID },
      create: {
        id: "mision-saltos",
        clubId: STAR_CLUB_ID,
        title: "200 Saltos",
        description: "Realiza 200 saltos (cuerda, verticales o laterales). Ideal para mejorar la explosividad.",
        xpReward: 100,
        type: "WEEKLY",
        icon: "⚡",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-asistencia-semanal" },
      update: { icon: "📅", clubId: STAR_CLUB_ID },
      create: {
        id: "mision-asistencia-semanal",
        clubId: STAR_CLUB_ID,
        title: "Doble Presencia",
        description: "Asiste a los dos entrenamientos de la semana (miercoles y viernes). Se completa automaticamente cuando el entrenador toma asistencia.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "📅",
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${missions.length} misiones`);

  // ── Rewards ───────────────────────────────────────────────────────────────
  const rewards = await Promise.all([
    prisma.reward.upsert({ where: { id: "reward-first-step"     }, update: { icon: "⭐",  clubId: STAR_CLUB_ID }, create: { id: "reward-first-step",     clubId: STAR_CLUB_ID, title: "Primer Paso",         description: "Completaste tu primera misión",                         icon: "⭐",  levelRequired: 1  } }),
    prisma.reward.upsert({ where: { id: "reward-rising-star"    }, update: { icon: "🌟",  clubId: STAR_CLUB_ID }, create: { id: "reward-rising-star",    clubId: STAR_CLUB_ID, title: "Estrella en Ascenso", description: "Alcanzaste el nivel 2",                                  icon: "🌟",  levelRequired: 2  } }),
    prisma.reward.upsert({ where: { id: "reward-dedicated"      }, update: { icon: "🔥",  clubId: STAR_CLUB_ID }, create: { id: "reward-dedicated",      clubId: STAR_CLUB_ID, title: "Atleta Dedicado",     description: "Mantuvo una racha de 7 días",                            icon: "🔥",  levelRequired: 3  } }),
    prisma.reward.upsert({ where: { id: "reward-wing-headband"  }, update: { icon: "🏅", title: "Cintillo WING",   description: "Premio físico: cintillo deportivo de la marca WING",   clubId: STAR_CLUB_ID }, create: { id: "reward-wing-headband",  clubId: STAR_CLUB_ID, title: "Cintillo WING",   description: "Premio físico: cintillo deportivo de la marca WING",   icon: "🏅", levelRequired: 4 } }),
    prisma.reward.upsert({ where: { id: "reward-bronze"         }, update: { icon: "🥉",  clubId: STAR_CLUB_ID }, create: { id: "reward-bronze",         clubId: STAR_CLUB_ID, title: "Insignia Bronce",     description: "Alcanzaste el nivel 5",                                  icon: "🥉",  levelRequired: 5  } }),
    prisma.reward.upsert({ where: { id: "reward-wing-wristband" }, update: { icon: "⌚", title: "Brazalete WING", description: "Premio físico: brazalete deportivo de la marca WING", clubId: STAR_CLUB_ID }, create: { id: "reward-wing-wristband", clubId: STAR_CLUB_ID, title: "Brazalete WING", description: "Premio físico: brazalete deportivo de la marca WING", icon: "⌚", levelRequired: 7 } }),
    prisma.reward.upsert({ where: { id: "reward-silver"         }, update: { icon: "🥈",  clubId: STAR_CLUB_ID }, create: { id: "reward-silver",         clubId: STAR_CLUB_ID, title: "Insignia Plata",      description: "Alcanzaste el nivel 8",                                  icon: "🥈",  levelRequired: 8  } }),
    prisma.reward.upsert({ where: { id: "reward-gold"           }, update: { icon: "🥇",  clubId: STAR_CLUB_ID }, create: { id: "reward-gold",           clubId: STAR_CLUB_ID, title: "Insignia Oro",        description: "Alcanzaste el nivel 12",                                 icon: "🥇",  levelRequired: 12 } }),
  ]);
  console.log(`✅ ${rewards.length} logros`);

  console.log("\n🎉 Seed completo. Base de datos lista.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
