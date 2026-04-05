import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }) } as never);
db.user.update({ where: { email: "admin@starclub.com" }, data: { name: "Camilo Ponton" } })
  .then((u) => { console.log("✅ Admin name updated to:", u.name); })
  .catch(console.error)
  .finally(() => (db as any).$disconnect());
