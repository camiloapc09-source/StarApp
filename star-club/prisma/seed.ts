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
 * Production seed â€” safe to re-run at ANY time.
 * Only upserts static base data (categories, admin account, real missions).
 * NEVER deletes existing data. NEVER creates demo players/coaches/parents.
 */
async function main() {
  console.log("ðŸŒ± Seeding Star Club (production-safe)...\n");

  // â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "U-12" },
      update: {},
      create: { name: "U-12", description: "Menores de 12 aÃ±os", ageMin: 8, ageMax: 12 },
    }),
    prisma.category.upsert({
      where: { name: "U-15" },
      update: {},
      create: { name: "U-15", description: "Menores de 15 aÃ±os", ageMin: 12, ageMax: 15 },
    }),
    prisma.category.upsert({
      where: { name: "U-18" },
      update: {},
      create: { name: "U-18", description: "Menores de 18 aÃ±os", ageMin: 15, ageMax: 18 },
    }),
    prisma.category.upsert({
      where: { name: "Senior" },
      update: {},
      create: { name: "Senior", description: "DivisiÃ³n adultos", ageMin: 18, ageMax: 40 },
    }),
  ]);
  console.log(`âœ… ${categories.length} categorÃ­as`);

  // â”€â”€ Admin account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const adminPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@starclub.com" },
    update: {},
    create: {
      name: "Camilo Ponton",
      email: "admin@starclub.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("âœ… Admin: admin@starclub.com");

  // â”€â”€ Real missions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const missions = await Promise.all([
    prisma.mission.upsert({
      where: { id: "mision-abdominales" },
      update: {},
      create: {
        id: "mision-abdominales",
        title: "200 Abdominales",
        description: "Completa 200 abdominales. Puedes hacerlos en cualquier lugar: cancha, parque, casa o gym.",
        xpReward: 150,
        type: "WEEKLY",
        icon: "ðŸ’ª",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-5km" },
      update: {},
      create: {
        id: "mision-5km",
        title: "Correr 5 KilÃ³metros",
        description: "Corre 5 kilÃ³metros sin parar. Trota por el parque, cancha o cualquier terreno.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "ðŸƒ",
        isActive: true,
      },
    }),
    prisma.mission.upsert({
      where: { id: "mision-saltos" },
      update: {},
      create: {
        id: "mision-saltos",
        title: "200 Saltos",
        description: "Realiza 200 saltos (cuerda, verticales o laterales). Ideal para mejorar la explosividad.",
        xpReward: 100,
        type: "WEEKLY",
        icon: "âš¡",
        isActive: true,
      },
    }),
  ]);
  console.log(`âœ… ${missions.length} misiones`);

  // â”€â”€ Rewards (static, safe to upsert) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rewards = await Promise.all([
    prisma.reward.upsert({ where: { id: "reward-first-step" }, update: {}, create: { id: "reward-first-step", title: "Primer Paso", description: "Completaste tu primera misiÃ³n", icon: "â­", levelRequired: 1 } }),
    prisma.reward.upsert({ where: { id: "reward-rising-star" }, update: {}, create: { id: "reward-rising-star", title: "Estrella en Ascenso", description: "Alcanzaste el nivel 2", icon: "ðŸŒŸ", levelRequired: 2 } }),
    prisma.reward.upsert({ where: { id: "reward-dedicated" }, update: {}, create: { id: "reward-dedicated", title: "Atleta Dedicado", description: "Mantuvo una racha de 7 dÃ­as", icon: "ðŸ”¥", levelRequired: 3 } }),
    prisma.reward.upsert({ where: { id: "reward-bronze" }, update: {}, create: { id: "reward-bronze", title: "Insignia Bronce", description: "Alcanzaste el nivel 5", icon: "ðŸ¥‰", levelRequired: 5 } }),
    prisma.reward.upsert({ where: { id: "reward-silver" }, update: {}, create: { id: "reward-silver", title: "Insignia Plata", description: "Alcanzaste el nivel 8", icon: "ðŸ¥ˆ", levelRequired: 8 } }),
    prisma.reward.upsert({ where: { id: "reward-gold" }, update: {}, create: { id: "reward-gold", title: "Insignia Oro", description: "Alcanzaste el nivel 12", icon: "ðŸ¥‡", levelRequired: 12 } }),
  ]);
  console.log(`âœ… ${rewards.length} logros`);

  console.log("\nðŸŽ‰ Seed completo. Base de datos de producciÃ³n lista.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

