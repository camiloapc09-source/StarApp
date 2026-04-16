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

/**
 * Production seed - safe to re-run at ANY time.
 * Only upserts static base data (categories, admin account, real missions).
 * NEVER deletes existing data. NEVER creates demo players/coaches/parents.
 */
async function main() {
  console.log("\u{1F331} Seeding Star Club (production-safe)...\n");

  // Apply schema migrations that may not exist in production yet
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "coachCategoryIds" TEXT NOT NULL DEFAULT '[]'`);
    console.log("\u2705 Migration: added coachCategoryIds column");
  } catch {
    // Column already exists, ignore
  }
  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "U-12" },
      update: {},
      create: { name: "U-12", description: "Menores de 12 a\u00F1os", ageMin: 8, ageMax: 12 },
    }),
    prisma.category.upsert({
      where: { name: "U-15" },
      update: {},
      create: { name: "U-15", description: "Menores de 15 a\u00F1os", ageMin: 12, ageMax: 15 },
    }),
    prisma.category.upsert({
      where: { name: "U-18" },
      update: {},
      create: { name: "U-18", description: "Menores de 18 a\u00F1os", ageMin: 15, ageMax: 18 },
    }),
    prisma.category.upsert({
      where: { name: "Senior" },
      update: {},
      create: { name: "Senior", description: "Divisi\u00F3n adultos", ageMin: 18, ageMax: 40 },
    }),
  ]);
  console.log(`\u2705 ${categories.length} categor\u00EDas`);

  // Admin account — update password every seed run so it stays in sync
  const adminPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@starclub.com" },
    update: { password: adminPassword },
    create: {
      name: "Camilo Ponton",
      email: "admin@starclub.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("\u2705 Admin: admin@starclub.com / admin123");

  // Real missions
  const missions = await Promise.all([
    prisma.mission.upsert({
      where: { id: "mision-abdominales" },
      update: { icon: "\u{1F4AA}" },
      create: {
        id: "mision-abdominales",
        title: "200 Abdominales",
        description: "Completa 200 abdominales. Puedes hacerlos en cualquier lugar: cancha, parque, casa o gym.",
        xpReward: 150,
        type: "WEEKLY",
        icon: "\u{1F4AA}",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-5km" },
      update: { icon: "\u{1F3C3}", title: "Correr 5 Kil\u00F3metros" },
      create: {
        id: "mision-5km",
        title: "Correr 5 Kil\u00F3metros",
        description: "Corre 5 kil\u00F3metros sin parar. Trota por el parque, cancha o cualquier terreno.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "\u{1F3C3}",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-saltos" },
      update: { icon: "\u26A1" },
      create: {
        id: "mision-saltos",
        title: "200 Saltos",
        description: "Realiza 200 saltos (cuerda, verticales o laterales). Ideal para mejorar la explosividad.",
        xpReward: 100,
        type: "WEEKLY",
        icon: "\u26A1",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-asistencia-semanal" },
      update: { icon: "\u{1F4C5}" },
      create: {
        id: "mision-asistencia-semanal",
        title: "Doble Presencia",
        description: "Asiste a los dos entrenamientos de la semana (miercoles y viernes). Se completa automaticamente cuando el entrenador toma asistencia.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "\u{1F4C5}",
        isActive: true,
      },
    }),
  ]);
  console.log(`\u2705 ${missions.length} misiones`);

  // Rewards
  const rewards = await Promise.all([
    prisma.reward.upsert({ where: { id: "reward-first-step"    }, update: { icon: "\u2B50"      }, create: { id: "reward-first-step",    title: "Primer Paso",         description: "Completaste tu primera misi\u00F3n",                         icon: "\u2B50",       levelRequired: 1  } }),
    prisma.reward.upsert({ where: { id: "reward-rising-star"   }, update: { icon: "\u{1F31F}"   }, create: { id: "reward-rising-star",   title: "Estrella en Ascenso", description: "Alcanzaste el nivel 2",                                      icon: "\u{1F31F}",    levelRequired: 2  } }),
    prisma.reward.upsert({ where: { id: "reward-dedicated"     }, update: { icon: "\u{1F525}"   }, create: { id: "reward-dedicated",     title: "Atleta Dedicado",     description: "Mantuvo una racha de 7 d\u00EDas",                           icon: "\u{1F525}",    levelRequired: 3  } }),
    prisma.reward.upsert({ where: { id: "reward-wing-headband" }, update: { icon: "\u{1F3C5}", title: "Cintillo WING", description: "Premio f\u00EDsico: cintillo deportivo de la marca WING" }, create: { id: "reward-wing-headband", title: "Cintillo WING", description: "Premio f\u00EDsico: cintillo deportivo de la marca WING", icon: "\u{1F3C5}", levelRequired: 4 } }),
    prisma.reward.upsert({ where: { id: "reward-bronze"        }, update: { icon: "\u{1F949}"   }, create: { id: "reward-bronze",        title: "Insignia Bronce",     description: "Alcanzaste el nivel 5",                                      icon: "\u{1F949}",    levelRequired: 5  } }),
    prisma.reward.upsert({ where: { id: "reward-wing-wristband"}, update: { icon: "\u231A",    title: "Brazalete WING", description: "Premio f\u00EDsico: brazalete deportivo de la marca WING" }, create: { id: "reward-wing-wristband", title: "Brazalete WING", description: "Premio f\u00EDsico: brazalete deportivo de la marca WING", icon: "\u231A", levelRequired: 7 } }),
    prisma.reward.upsert({ where: { id: "reward-silver"        }, update: { icon: "\u{1F948}"   }, create: { id: "reward-silver",        title: "Insignia Plata",      description: "Alcanzaste el nivel 8",                                      icon: "\u{1F948}",    levelRequired: 8  } }),
    prisma.reward.upsert({ where: { id: "reward-gold"          }, update: { icon: "\u{1F947}"   }, create: { id: "reward-gold",          title: "Insignia Oro",        description: "Alcanzaste el nivel 12",                                     icon: "\u{1F947}",    levelRequired: 12 } }),
  ]);
  console.log(`\u2705 ${rewards.length} logros`);

  console.log("\n\u{1F389} Seed completo. Base de datos de producci\u00F3n lista.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());