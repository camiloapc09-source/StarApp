/**
 * Migrate existing parent credentials for Star Club.
 *
 * For each PARENT user in Star Club:
 *   1. Find their linked player(s) via ParentPlayer → Player
 *   2. Get the first player's documentNumber
 *   3. Update parent's email = documentNumber, password = hash(documentNumber)
 *
 * Run: npx tsx scripts/migrate-parent-credentials.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) } as never);
}

const db = createPrismaClient();

const STAR_CLUB_ID = "club-star";

async function main() {
  // Find all parent users in Star Club
  const parents = await db.user.findMany({
    where: { clubId: STAR_CLUB_ID, role: "PARENT" },
    include: {
      parentProfile: {
        include: {
          children: {
            include: {
              player: { select: { documentNumber: true } },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${parents.length} parent(s) in Star Club to migrate.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const parent of parents) {
    const children = parent.parentProfile?.children ?? [];
    // Find the first linked player with a document number
    const docNumber = children
      .map((c) => c.player.documentNumber)
      .find((d) => d && d.trim().length > 0);

    if (!docNumber) {
      console.log(`  SKIP: "${parent.name}" (${parent.email}) — no linked player with document number`);
      skipped++;
      continue;
    }

    // Check if another user already has this email (document number) in this club
    const existing = await db.user.findFirst({
      where: { email: docNumber, clubId: STAR_CLUB_ID, id: { not: parent.id } },
    });

    if (existing) {
      console.log(`  SKIP: "${parent.name}" — document "${docNumber}" already in use by user "${existing.name}" (${existing.id})`);
      skipped++;
      continue;
    }

    const hashedPwd = await hash(docNumber, 12);

    await db.user.update({
      where: { id: parent.id },
      data: { email: docNumber, password: hashedPwd },
    });

    console.log(`  OK: "${parent.name}" — email "${parent.email}" → "${docNumber}"`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
