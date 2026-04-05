import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const emailsToDelete = [
    "coach@starclub.com",
    "player@starclub.com",
    "lucas@starclub.com",
    "emma@starclub.com",
    "diego@starclub.com",
    "sara@starclub.com",
    "james@starclub.com",
  ];

  console.log("Searching for demo players/coaches to delete...");
  const users = await prisma.user.findMany({
    where: {
      email: { in: emailsToDelete },
      role: { in: ["PLAYER", "COACH"] },
    },
    select: { id: true, email: true, role: true },
  });

  if (users.length === 0) {
    console.log("No demo players or coaches found. Nothing to delete.");
    return;
  }

  console.log(`Found ${users.length} user(s):`);
  users.forEach((u) => console.log(` - ${u.email} (${u.role})`));

  const confirm = true; // auto-confirm since user requested deletion
  if (!confirm) {
    console.log("Aborting deletion.");
    return;
  }

  const result = await prisma.user.deleteMany({
    where: {
      email: { in: emailsToDelete },
      role: { in: ["PLAYER", "COACH"] },
    },
  });

  console.log(`Deleted ${result.count} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
