-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "playerMissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "notes" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "Evidence_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_playerMissionId_fkey" FOREIGN KEY ("playerMissionId") REFERENCES "PlayerMission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
