/**
 * Export all data from Turso → turso-backup.json
 * Run: npx tsx prisma/export-turso.ts
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { writeFileSync } from "fs";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function fetchTable(table: string) {
  const result = await client.execute(`SELECT * FROM "${table}"`);
  return result.rows;
}

async function main() {
  console.log("📦 Exportando datos de Turso...\n");

  const tables = [
    "Club",
    "User",
    "Category",
    "Player",
    "Parent",
    "ParentPlayer",
    "Session",
    "Attendance",
    "Payment",
    "Mission",
    "PlayerMission",
    "Evidence",
    "Reward",
    "PlayerReward",
    "Notification",
    "Invite",
    "UniformOrder",
  ];

  const backup: Record<string, unknown[]> = {};

  for (const table of tables) {
    try {
      const rows = await fetchTable(table);
      backup[table] = rows as unknown[];
      console.log(`✅ ${table}: ${rows.length} filas`);
    } catch (err) {
      console.warn(`⚠️  ${table}: tabla no encontrada o vacía (${(err as Error).message})`);
      backup[table] = [];
    }
  }

  const outputPath = "prisma/turso-backup.json";
  writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf-8");

  const total = Object.values(backup).reduce((s, rows) => s + rows.length, 0);
  console.log(`\n🎉 Backup guardado en ${outputPath}`);
  console.log(`   Total: ${total} registros en ${tables.length} tablas`);
}

main()
  .catch(console.error)
  .finally(() => client.close());
