/**
 * Crea (o recrea) el "Club Demo": un club aislado con datos ficticios para
 * probar la app y mostrarla a clubes interesados, sin tocar datos reales.
 *
 *   node scripts/seed-demo-club.cjs
 *
 * Es repetible: borra SOLO lo del club `club-demo` y lo vuelve a crear.
 * Entrar en /demo con:
 *   Admin      admin@demo.starapp        / Demo2026!
 *   Acudiente  3001112233 (celular)      / Demo2026!
 *   Deportista 1100000001 (documento)    / Demo2026!
 *
 * Los correos @demo.starapp no se envían (ver lib/email.ts).
 */
// La base usa `timestamp` sin zona: el driver escribe en la zona del proceso.
// Se fija UTC para que las fechas queden igual que las guarda la app en Render.
process.env.TZ = "UTC";
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)[1].replace(/^"|"$/g, "");
}

const CLUB = "club-demo";
const PASSWORD = "Demo2026!";

// Fechas relativas a hoy. Las sesiones se guardan con la hora "de reloj" en
// UTC (4 p.m. → 16:00Z), que es la convención del formulario de sesiones.
const today = new Date();
const day = (offset, hourUtc = 16) => {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, hourUtc));
  return d;
};
// Vencimiento: día `d` del mes con desplazamiento `m`, a medianoche Colombia (05:00 UTC).
const due = (m, d) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + m, d, 5));

async function main() {
  const pool = new Pool({ connectionString: databaseUrl() });
  const db = await pool.connect();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  try {
    await db.query("BEGIN");

    // ── Limpieza (solo club-demo) ──────────────────────────────────────────
    await db.query(`DELETE FROM "Payment" WHERE "clubId" = $1`, [CLUB]);
    await db.query(`DELETE FROM "Session" WHERE "clubId" = $1`, [CLUB]);
    await db.query(`DELETE FROM "Mission" WHERE "clubId" = $1`, [CLUB]);
    await db.query(`DELETE FROM "User" WHERE "clubId" = $1`, [CLUB]);
    await db.query(`DELETE FROM "Category" WHERE "clubId" = $1`, [CLUB]);
    await db.query(`DELETE FROM "Club" WHERE id = $1`, [CLUB]);

    // ── Club ───────────────────────────────────────────────────────────────
    await db.query(
      `INSERT INTO "Club" (id, name, slug, sport, plan, country, city, logo, "billingCycleDay", "earlyPaymentDays", "earlyPaymentDiscount",
         "brandPrimary", "brandSecondary", "brandBackground", "updatedAt")
       VALUES ($1,'Club Demo','demo','BASKETBALL','PRO','CO','Barranquilla','/logo.jpeg',1,5,5000,'#7F73C4','#E8401C','#08080C',$2)`,
      [CLUB, now],
    );

    const cats = [
      ["demo-cat-sub12", "Sub-12", 10, 12],
      ["demo-cat-sub15", "Sub-15", 13, 15],
    ];
    for (const [id, name, min, max] of cats) {
      await db.query(`INSERT INTO "Category" (id, "clubId", name, "ageMin", "ageMax") VALUES ($1,$2,$3,$4,$5)`, [id, CLUB, name, min, max]);
    }

    const user = async (id, name, email, role, extra = {}) => {
      await db.query(
        `INSERT INTO "User" (id, "clubId", name, email, password, role, phone, "documentNumber", "setupCompleted", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,
        [id, CLUB, name, email, hash, role, extra.phone ?? null, extra.doc ?? null, now],
      );
    };

    await user("demo-admin", "Camila Ortiz", "admin@demo.starapp", "ADMIN");
    await user("demo-coach", "Carlos Rojas", "coach@demo.starapp", "COACH", { phone: "3009998877" });
    await user("demo-parent", "Laura Pérez", "acudiente@demo.starapp", "PARENT", { phone: "3001112233", doc: "32000111" });
    await db.query(`INSERT INTO "Parent" (id, "userId", phone, relation) VALUES ('demo-parent-p','demo-parent','3001112233','Madre')`);

    // ── Deportistas ────────────────────────────────────────────────────────
    // [id, nombre, documento, categoría, nacimiento, xp, nivel, racha, dorsal, posición]
    const players = [
      ["santiago", "Santiago Pérez", "1100000001", "demo-cat-sub12", "2014-05-10", 1240, 5, 6, 7, "Base"],
      ["valentina", "Valentina Pérez", "1100000002", "demo-cat-sub15", "2011-09-22", 760, 4, 2, 11, "Alera"],
      ["mateo", "Mateo Gómez", "1100000003", "demo-cat-sub12", "2014-02-14", 1510, 6, 9, 23, "Escolta"],
      ["isabella", "Isabella Ruiz", "1100000004", "demo-cat-sub12", "2015-01-30", 980, 4, 3, 5, "Base"],
      ["samuel", "Samuel Castro", "1100000005", "demo-cat-sub12", "2014-11-03", 720, 3, 1, 14, "Pívot"],
      ["sofia", "Sofía Herrera", "1100000006", "demo-cat-sub12", "2014-07-19", 1320, 5, 7, 9, "Alera"],
      ["emiliano", "Emiliano Vargas", "1100000007", "demo-cat-sub12", "2015-03-08", 410, 2, 0, 4, "Escolta"],
      ["mariana", "Mariana López", "1100000008", "demo-cat-sub15", "2012-04-02", 1105, 5, 4, 8, "Base"],
      ["tomas", "Tomás Jiménez", "1100000009", "demo-cat-sub15", "2011-12-12", 640, 3, 2, 21, "Pívot"],
    ];
    for (const [key, name, doc, cat, dob, xp, level, streak, jersey, position] of players) {
      const uid = `demo-u-${key}`;
      await user(uid, name, `${doc}@demo.starapp`, "PLAYER", { doc });
      await db.query(
        `INSERT INTO "Player" (id, "clubId", "userId", "categoryId", "dateOfBirth", "documentNumber", "joinDate", "paymentDay", "monthlyAmount",
           "jerseyNumber", position, status, xp, level, streak, "lastActive", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,3,70000,$8,$9,'ACTIVE',$10,$11,$12,$13,$14)`,
        [`demo-p-${key}`, CLUB, uid, cat, new Date(`${dob}T05:00:00Z`), doc, new Date("2025-02-03T05:00:00Z"), jersey, position, xp, level, streak, day(-1), now],
      );
    }
    for (const kid of ["santiago", "valentina"]) {
      await db.query(`INSERT INTO "ParentPlayer" (id, "parentId", "playerId") VALUES ($1,'demo-parent-p',$2)`, [`demo-pp-${kid}`, `demo-p-${kid}`]);
    }

    // ── Entrenos: 12 pasados con asistencia y 4 próximos ───────────────────
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"];
    let s = 0;
    for (let offset = -26; offset <= 9; offset++) {
      const d = day(offset);
      const wd = d.getUTCDay(); // 1 lun, 3 mié, 5 vie, 6 sáb
      if (![1, 3, 5, 6].includes(wd)) continue;
      const isMatch = wd === 6;
      if (isMatch && offset < 0 && offset % 2 === 0) continue;
      for (const [cat, catName] of [["demo-cat-sub12", "Sub-12"], ["demo-cat-sub15", "Sub-15"]]) {
        const id = `demo-s-${s++}`;
        await db.query(
          `INSERT INTO "Session" (id, "clubId", title, type, date, "categoryId", "coachId", location, notes)
           VALUES ($1,$2,$3,$4,$5,$6,'demo-coach',$7,$8)`,
          [
            id, CLUB,
            isMatch ? `Partido vs. Halcones ${catName}` : `Entreno ${catName}`,
            isMatch ? "MATCH" : "TRAINING",
            isMatch ? day(offset, 9) : d,
            cat,
            isMatch ? "Coliseo Elías Chegwin" : "Cancha Parque Sagrado Corazón",
            isMatch ? "Llegar 45 min antes con uniforme azul." : wd === 1 ? "Trabajo de fundamentos: dribling y bandeja." : null,
          ],
        );
        if (offset < 0) {
          for (const p of players.filter((x) => x[3] === cat)) {
            const st = p[0] === "santiago"
              ? (s % 6 === 0 ? "ABSENT" : "PRESENT")
              : statuses[(s + p[2].charCodeAt(9)) % statuses.length];
            await db.query(`INSERT INTO "Attendance" (id, "playerId", "sessionId", status) VALUES ($1,$2,$3,$4)`, [`${id}-${p[0]}`, `demo-p-${p[0]}`, id, st]);
          }
        }
      }
    }

    // ── Cobros ─────────────────────────────────────────────────────────────
    const label = (m) => {
      const a = due(m, 3), b = due(m + 1, 2);
      const f = (d, y) => d.toLocaleDateString("es-CO", { day: "numeric", month: "short", ...(y ? { year: "numeric" } : {}), timeZone: "America/Bogota" });
      return `Mensualidad ${f(a)} – ${f(b, true)}`;
    };
    let pay = 0;
    const payment = (player, m, status, paidOffset) =>
      db.query(
        `INSERT INTO "Payment" (id, "clubId", "playerId", amount, concept, status, "dueDate", "paidAt", "paymentMethod")
         VALUES ($1,$2,$3,70000,$4,$5,$6,$7,$8)`,
        [`demo-pay-${pay++}`, CLUB, `demo-p-${player}`, label(m), status, due(m, 3),
          status === "COMPLETED" ? new Date(due(m, 3).getTime() + paidOffset * 86400000) : null,
          status === "COMPLETED" ? (pay % 2 ? "NEQUI" : "TRANSFER") : null],
      );
    // Santiago al día; Valentina con el mes en curso vencido (para ver ambos estados).
    for (const m of [-3, -2, -1, 0]) await payment("santiago", m, "COMPLETED", -1);
    await payment("santiago", 1, "PENDING");
    for (const m of [-3, -2, -1]) await payment("valentina", m, "COMPLETED", 2);
    await payment("valentina", 0, "OVERDUE");
    for (const p of players.slice(2)) {
      await payment(p[0], -1, "COMPLETED", 0);
      await payment(p[0], 0, p[0] === "emiliano" ? "OVERDUE" : "COMPLETED", 1);
      await payment(p[0], 1, "PENDING");
    }

    // ── Misiones ───────────────────────────────────────────────────────────
    const missions = [
      ["demo-m-1", "100 tiros libres", "Lanza 100 tiros libres y anota cuántos encestaste.", 50, "DAILY", "🏀"],
      ["demo-m-2", "Racha de asistencia", "Asiste a 4 entrenos seguidos sin faltar.", 120, "WEEKLY", "🔥"],
      ["demo-m-3", "Dribling con mano débil", "10 minutos de dribling solo con tu mano débil.", 40, "DAILY", "✋"],
      ["demo-m-4", "Lectura de juego", "Mira un partido y escribe 3 jugadas que aprendiste.", 80, "CHALLENGE", "🧠"],
    ];
    for (const [id, title, desc, xp, type, icon] of missions) {
      await db.query(`INSERT INTO "Mission" (id, "clubId", title, description, "xpReward", type, icon) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, CLUB, title, desc, xp, type, icon]);
    }
    const pm = [
      ["santiago", "demo-m-1", "COMPLETED", 1, 1],
      ["santiago", "demo-m-2", "ACTIVE", 3, 4],
      ["santiago", "demo-m-3", "ACTIVE", 0, 1],
      ["valentina", "demo-m-4", "ACTIVE", 1, 3],
    ];
    for (const [p, m, st, prog, target] of pm) {
      await db.query(
        `INSERT INTO "PlayerMission" (id, "playerId", "missionId", status, progress, target, "completedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [`demo-pm-${p}-${m}`, `demo-p-${p}`, m, st, prog, target, st === "COMPLETED" ? day(-1) : null],
      );
    }

    // ── Notificaciones del acudiente ──────────────────────────────────────
    const notes = [
      ["Pago confirmado ✓", `Tu pago de $70.000 por "${label(0)}" fue confirmado.`, "PAYMENT", true],
      ["Pago vencido ⚠️", `El pago de $70.000 de Valentina por "${label(0)}" está vencido.`, "PAYMENT", false],
      ["Partido este sábado 🏀", "Santiago está convocado al partido vs. Halcones. Llegar 45 min antes.", "INFO", false],
    ];
    let n = 0;
    for (const [title, message, type, read] of notes) {
      await db.query(`INSERT INTO "Notification" (id, "userId", title, message, type, "isRead") VALUES ($1,'demo-parent',$2,$3,$4,$5)`, [`demo-n-${n++}`, title, message, type, read]);
    }

    await db.query("COMMIT");
    console.log("Club Demo listo → /demo");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
