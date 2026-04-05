-- AlterTable
ALTER TABLE "Parent" ADD COLUMN "relation" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Payment" ADD COLUMN "proofNote" TEXT;
ALTER TABLE "Payment" ADD COLUMN "proofUrl" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "address" TEXT;
ALTER TABLE "Player" ADD COLUMN "documentNumber" TEXT;
ALTER TABLE "Player" ADD COLUMN "joinDate" DATETIME;
ALTER TABLE "Player" ADD COLUMN "paymentDay" INTEGER;
ALTER TABLE "Player" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "payload" JSONB,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" DATETIME,
    "createdBy" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UniformOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jerseySize" TEXT NOT NULL,
    "shortsSize" TEXT NOT NULL,
    "nameOnJersey" TEXT NOT NULL,
    "numberOnJersey" INTEGER,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UniformOrder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UniformOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "phone" TEXT,
    "branch" TEXT,
    "emergencyContact" TEXT,
    "eps" TEXT,
    "avatar" TEXT,
    "avatarPending" TEXT,
    "avatarStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "avatar", "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
