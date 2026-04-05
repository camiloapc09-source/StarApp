import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }) } as never);

async function main() {
  const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  const missions = await db.mission.findMany({ select: { id: true, title: true } });
  const sessions = await db.session.findMany({ select: { id: true, title: true, date: true, coachId: true } });
  const cats = await db.category.findMany({ select: { id: true, name: true } });
  console.log("USERS:", JSON.stringify(users, null, 2));
  console.log("MISSIONS:", JSON.stringify(missions, null, 2));
  console.log("SESSIONS:", JSON.stringify(sessions, null, 2));
  console.log("CATS:", JSON.stringify(cats, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
