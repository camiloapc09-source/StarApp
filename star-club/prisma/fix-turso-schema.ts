import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN ?? "";
const client = createClient({ url, authToken });

async function main() {
  const alters = [
    `ALTER TABLE "User" ADD COLUMN "coachCategoryId" TEXT`,
    `ALTER TABLE "Session" ADD COLUMN "coachId" TEXT`,
  ];
  for (const sql of alters) {
    try {
      await client.execute(sql);
      console.log("✓ Added:", sql.slice(0, 60));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("skip (exists):", msg.slice(0, 80));
    }
  }
  console.log("Done.");
  process.exit(0);
}
main();
