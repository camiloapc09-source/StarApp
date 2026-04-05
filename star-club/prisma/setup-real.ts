/**
 * Finish demo cleanup + seed real data.
 * Run: npx tsx prisma/setup-real.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }) } as never);

async function main() {
  console.log("🔧 Setting up real data...\n");

  // 1. Delete remaining demo user
  const del = await db.user.deleteMany({ where: { email: { in: ["parent@starclub.com"] } } });
  console.log(`🗑  Deleted ${del.count} remaining demo user (Catherine Drake)`);

  // 2. Delete all orphaned/demo sessions
  const delSessions = await db.session.deleteMany({});
  console.log(`🗑  Deleted ${delSessions.count} demo sessions`);

  // 3. Delete demo missions
  const delMissions = await db.mission.deleteMany({
    where: { id: { in: ["mission-score", "mission-attend", "mission-first", "mission-assist", "mission-champion"] } },
  });
  console.log(`🗑  Deleted ${delMissions.count} demo missions`);

  // 4. Create 3 real missions (upsert so safe to re-run)
  const realMissions = await Promise.all([
    db.mission.upsert({
      where: { id: "mision-abdominales" },
      update: {},
      create: {
        id: "mision-abdominales",
        title: "200 Abdominales",
        description: "Completa 200 abdominales. Puedes hacerlos en cualquier lugar: cancha, parque, casa o gym.",
        xpReward: 150,
        type: "WEEKLY",
        icon: "💪",
        isActive: true,
      },
    }),
    db.mission.upsert({
      where: { id: "mision-5km" },
      update: {},
      create: {
        id: "mision-5km",
        title: "Correr 5 Kilómetros",
        description: "Corre 5 kilómetros sin parar. Trota por el parque, cancha o cualquier terreno.",
        xpReward: 200,
        type: "WEEKLY",
        icon: "🏃",
        isActive: true,
      },
    }),
    db.mission.upsert({
      where: { id: "mision-saltos" },
      update: {},
      create: {
        id: "mision-saltos",
        title: "200 Saltos",
        description: "Realiza 200 saltos (cuerda, verticales o laterales). Ideal para mejorar la explosividad.",
        xpReward: 100,
        type: "WEEKLY",
        icon: "⚡",
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${realMissions.length} real missions`);

  // 5. Create sessions for Wed Apr 8 and Fri Apr 10 led by Jose Padilla
  const josePadillaId = "cmnm7iulq000aq0v9p4z7zbh8";
  const newSessions = await Promise.all([
    db.session.create({
      data: {
        title: "Entrenamiento - Miércoles",
        type: "TRAINING",
        // Apr 8 2026 at 4:00 PM Colombia time (UTC-5 = 21:00 UTC)
        date: new Date("2026-04-08T21:00:00.000Z"),
        coachId: josePadillaId,
        notes: "Entrenamiento regular. Puntualidad exigida.",
      },
    }),
    db.session.create({
      data: {
        title: "Entrenamiento - Viernes",
        type: "TRAINING",
        // Apr 10 2026 at 4:00 PM Colombia time
        date: new Date("2026-04-10T21:00:00.000Z"),
        coachId: josePadillaId,
        notes: "Entrenamiento regular. Llevar hidratación.",
      },
    }),
  ]);
  console.log(`✅ Created ${newSessions.length} sessions (Apr 8 + Apr 10 with Jose Padilla)`);

  // 6. Summary
  console.log("\n📊 Current DB state:");
  const users = await db.user.findMany({ select: { name: true, email: true, role: true } });
  users.forEach((u) => console.log(`   ${u.role.padEnd(7)} ${u.name} <${u.email}>`));
  const missions = await db.mission.findMany({ select: { title: true } });
  console.log(`\n   Missions (${missions.length}): ${missions.map((m) => m.title).join(", ")}`);
  const sessions = await db.session.findMany({ select: { title: true, date: true } });
  console.log(`   Sessions (${sessions.length}): ${sessions.map((s) => `${s.title} (${new Date(s.date).toLocaleDateString("es-CO")})`).join(", ")}`);
}

main().catch(console.error).finally(() => db.$disconnect());
