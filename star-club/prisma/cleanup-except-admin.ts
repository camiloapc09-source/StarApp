import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("Finding admin user(s)...");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });

  if (!admins || admins.length === 0) {
    console.log("No admin user found. Aborting to avoid accidental deletion.");
    return;
  }

  console.log(`Found ${admins.length} admin user(s):`);
  admins.forEach((a) => console.log(` - ${a.email} (${a.id})`));

  const adminIds = admins.map((a) => a.id);

  console.log("Deleting all users that are NOT admin...");
  const res = await prisma.user.deleteMany({ where: { id: { notIn: adminIds } } });
  console.log(`Deleted ${res.count} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
