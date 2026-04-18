import "dotenv/config";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});
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

  // ── Star Club ──────────────────────────────────────────────────────────────
  await prisma.club.upsert({
    where: { id: STAR_CLUB_ID },
    update: {},
    create: {
      id: STAR_CLUB_ID,
      name: "Star Club",
      slug: "star-club",
      email: "admin@starclub.com",
      sport: "BASKETBALL",
      country: "CO",
      city: "Colombia",
    },
  });
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
