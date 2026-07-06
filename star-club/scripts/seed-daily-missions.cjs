/**
 * Siembra un pack inicial de misiones DIARIAS (type DAILY, activas) en cada club.
 * Son misiones que se pueden cumplir en casa, corriendo o en el parque — sin cancha.
 * Idempotente: usa ids deterministas + ON CONFLICT, así que se puede re-ejecutar.
 *
 *   node scripts/seed-daily-missions.cjs
 */
require("dotenv").config();
const { Client } = require("pg");

const CLUBS = ["club-star", "club-ballbreakers"];

const MISSIONS = [
  { slug: "dribbling-casa", title: "Dribbling en casa", xpReward: 30, icon: "🏀",
    description: "Practica dribbling con tu mano dominante durante 10 minutos sin perder el balón." },
  { slug: "mano-debil", title: "Mano débil en casa", xpReward: 40, icon: "💪",
    description: "Practica dribbling con tu mano no dominante durante 10 minutos frente al espejo." },
  { slug: "fuerza", title: "Rutina de fuerza", xpReward: 50, icon: "🏋️",
    description: "Completa 3 series de 20 sentadillas, 15 flexiones y 20 abdominales en casa." },
  { slug: "saltos", title: "Saltos verticales", xpReward: 45, icon: "⬆️",
    description: "Completa 4 series de 10 saltos explosivos buscando la máxima altura cada vez." },
  { slug: "velocidad", title: "Carrera de velocidad", xpReward: 40, icon: "💨",
    description: "Realiza 6 carreras de 30 metros con 30 segundos de descanso entre cada una." },
  { slug: "dribbling-parque", title: "Dribbling en movimiento", xpReward: 50, icon: "🏃",
    description: "Lleva el balón driblando 500 metros en el parque sin perderlo." },
  { slug: "cardio", title: "Resistencia cardiovascular", xpReward: 60, icon: "❤️",
    description: "Corre 5 minutos a ritmo moderado sin detener el dribbling del balón." },
];

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  let created = 0;
  for (const club of CLUBS) {
    for (const m of MISSIONS) {
      const id = `dm-${club}-${m.slug}`;
      const res = await c.query(
        `INSERT INTO "Mission" (id, "clubId", title, description, "xpReward", type, icon, "isActive")
         VALUES ($1, $2, $3, $4, $5, 'DAILY', $6, true)
         ON CONFLICT (id) DO NOTHING`,
        [id, club, m.title, m.description, m.xpReward, m.icon],
      );
      created += res.rowCount;
    }
  }
  console.log(`Misiones diarias creadas (nuevas): ${created}`);
  await c.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
