import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  const migrationsDir = join(__dirname, "migrations");
  const entries = readdirSync(migrationsDir).sort();

  for (const entry of entries) {
    const sqlPath = join(migrationsDir, entry, "migration.sql");
    if (!existsSync(sqlPath)) continue;

    const sql = readFileSync(sqlPath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.execute(stmt + ";");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          // Table/column already exists — skip
        } else {
          console.warn(`⚠ ${entry}: ${msg}`);
        }
      }
    }
    console.log(`✓ ${entry}`);
  }

  console.log("\nSchema applied to Turso successfully.");
  process.exit(0);
}

main();
