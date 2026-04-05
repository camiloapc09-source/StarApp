import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const datasource: any = process.env.TURSO_DATABASE_URL
  ? {
      adapter: () =>
        new PrismaLibSql({
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN ?? "",
        }),
    }
  : { url: process.env["DATABASE_URL"] };

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource,
});
