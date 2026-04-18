/**
 * Import all data from turso-backup.json → Neon PostgreSQL
 * Run AFTER: npm run db:push (creates tables in Neon)
 * Run: npx tsx prisma/import-to-neon.ts
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "fs";

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  return false;
}

function date(v: unknown): Date | null {
  if (!v) return null;
  return new Date(v as string);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return Number(v);
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter } as never);
}

const db = createPrismaClient();

async function main() {
  const backup = JSON.parse(readFileSync("prisma/turso-backup.json", "utf-8"));

  console.log("🚀 Importando datos a Neon...\n");

  // ── Club ──────────────────────────────────────────────────────────────────
  for (const r of backup.Club) {
    await db.club.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, name: r.name, slug: r.slug, email: str(r.email),
        logo: str(r.logo), sport: r.sport ?? "BASKETBALL",
        country: r.country ?? "CO", city: str(r.city),
        createdAt: date(r.createdAt) ?? new Date(),
        updatedAt: date(r.updatedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Club: ${backup.Club.length}`);

  // ── Category ──────────────────────────────────────────────────────────────
  for (const r of backup.Category) {
    await db.category.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId, name: r.name,
        description: str(r.description), ageMin: Number(r.ageMin), ageMax: Number(r.ageMax),
        createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Category: ${backup.Category.length}`);

  // ── User ──────────────────────────────────────────────────────────────────
  for (const r of backup.User) {
    await db.user.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star",
        name: r.name, email: r.email, password: r.password,
        role: r.role ?? "PLAYER",
        phone: str(r.phone), branch: str(r.branch),
        emergencyContact: str(r.emergencyContact), eps: str(r.eps),
        avatar: str(r.avatar), avatarPending: str(r.avatarPending),
        avatarStatus: r.avatarStatus ?? "NONE",
        coachCategoryId: str(r.coachCategoryId),
        coachCategoryIds: r.coachCategoryIds ?? "[]",
        createdAt: date(r.createdAt) ?? new Date(),
        updatedAt: date(r.updatedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ User: ${backup.User.length}`);

  // ── Player ────────────────────────────────────────────────────────────────
  for (const r of backup.Player) {
    await db.player.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", userId: r.userId,
        categoryId: str(r.categoryId),
        dateOfBirth: date(r.dateOfBirth), documentNumber: str(r.documentNumber),
        address: str(r.address), phone: str(r.phone),
        joinDate: date(r.joinDate),
        paymentDay: num(r.paymentDay) !== null ? Number(r.paymentDay) : null,
        monthlyAmount: num(r.monthlyAmount) !== null ? Number(r.monthlyAmount) : null,
        position: str(r.position),
        jerseyNumber: num(r.jerseyNumber) !== null ? Number(r.jerseyNumber) : null,
        status: r.status ?? "ACTIVE",
        xp: Number(r.xp ?? 0), level: Number(r.level ?? 1),
        streak: Number(r.streak ?? 0), lastActive: date(r.lastActive),
        createdAt: date(r.createdAt) ?? new Date(),
        updatedAt: date(r.updatedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Player: ${backup.Player.length}`);

  // ── Parent ────────────────────────────────────────────────────────────────
  for (const r of backup.Parent) {
    await db.parent.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, userId: r.userId, phone: str(r.phone), relation: str(r.relation),
      },
    });
  }
  console.log(`✅ Parent: ${backup.Parent.length}`);

  // ── ParentPlayer ──────────────────────────────────────────────────────────
  for (const r of backup.ParentPlayer) {
    await db.parentPlayer.upsert({
      where: { parentId_playerId: { parentId: r.parentId, playerId: r.playerId } },
      update: {},
      create: { id: r.id, parentId: r.parentId, playerId: r.playerId },
    });
  }
  console.log(`✅ ParentPlayer: ${backup.ParentPlayer.length}`);

  // ── Session ───────────────────────────────────────────────────────────────
  for (const r of backup.Session) {
    await db.session.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", title: r.title,
        type: r.type ?? "TRAINING", date: date(r.date) ?? new Date(),
        categoryId: str(r.categoryId), coachId: str(r.coachId),
        notes: str(r.notes), createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Session: ${backup.Session.length}`);

  // ── Attendance ────────────────────────────────────────────────────────────
  for (const r of backup.Attendance) {
    await db.attendance.upsert({
      where: { playerId_sessionId: { playerId: r.playerId, sessionId: r.sessionId } },
      update: {},
      create: {
        id: r.id, playerId: r.playerId, sessionId: r.sessionId,
        status: r.status ?? "ABSENT", createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Attendance: ${backup.Attendance.length}`);

  // ── Payment ───────────────────────────────────────────────────────────────
  for (const r of backup.Payment) {
    await db.payment.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", playerId: r.playerId,
        amount: Number(r.amount), concept: r.concept, status: r.status ?? "PENDING",
        dueDate: date(r.dueDate) ?? new Date(), paidAt: date(r.paidAt),
        paymentMethod: str(r.paymentMethod), proofUrl: str(r.proofUrl),
        proofNote: str(r.proofNote), createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Payment: ${backup.Payment.length}`);

  // ── Mission ───────────────────────────────────────────────────────────────
  for (const r of backup.Mission) {
    await db.mission.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", title: r.title,
        description: r.description, xpReward: Number(r.xpReward),
        type: r.type ?? "WEEKLY", icon: str(r.icon),
        isActive: bool(r.isActive), createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Mission: ${backup.Mission.length}`);

  // ── PlayerMission ─────────────────────────────────────────────────────────
  for (const r of backup.PlayerMission) {
    await db.playerMission.upsert({
      where: { playerId_missionId: { playerId: r.playerId, missionId: r.missionId } },
      update: {},
      create: {
        id: r.id, playerId: r.playerId, missionId: r.missionId,
        status: r.status ?? "ACTIVE", progress: Number(r.progress ?? 0),
        target: Number(r.target ?? 1), completedAt: date(r.completedAt),
        assignedAt: date(r.assignedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ PlayerMission: ${backup.PlayerMission.length}`);

  // ── Evidence ──────────────────────────────────────────────────────────────
  for (const r of backup.Evidence) {
    await db.evidence.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, playerId: r.playerId, playerMissionId: r.playerMissionId,
        url: r.url, filename: str(r.filename), mimeType: str(r.mimeType),
        size: num(r.size) !== null ? Number(r.size) : null,
        status: r.status ?? "PENDING", submittedAt: date(r.submittedAt) ?? new Date(),
        verifiedAt: date(r.verifiedAt), verifiedBy: str(r.verifiedBy),
        notes: str(r.notes), deletedAt: date(r.deletedAt),
      },
    });
  }
  console.log(`✅ Evidence: ${backup.Evidence.length}`);

  // ── Reward ────────────────────────────────────────────────────────────────
  for (const r of backup.Reward) {
    await db.reward.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", title: r.title,
        description: r.description, icon: str(r.icon),
        levelRequired: Number(r.levelRequired ?? 1),
        createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Reward: ${backup.Reward.length}`);

  // ── PlayerReward ──────────────────────────────────────────────────────────
  for (const r of backup.PlayerReward) {
    await db.playerReward.upsert({
      where: { playerId_rewardId: { playerId: r.playerId, rewardId: r.rewardId } },
      update: {},
      create: {
        id: r.id, playerId: r.playerId, rewardId: r.rewardId,
        earnedAt: date(r.earnedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ PlayerReward: ${backup.PlayerReward.length}`);

  // ── Notification ──────────────────────────────────────────────────────────
  for (const r of backup.Notification) {
    await db.notification.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, userId: r.userId, title: r.title, message: r.message,
        type: r.type ?? "INFO", isRead: bool(r.isRead), link: str(r.link),
        createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Notification: ${backup.Notification.length}`);

  // ── Invite ────────────────────────────────────────────────────────────────
  for (const r of backup.Invite) {
    await db.invite.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, clubId: r.clubId ?? "club-star", code: r.code,
        role: r.role ?? "PLAYER",
        payload: r.payload ? JSON.parse(r.payload as string) : null,
        used: bool(r.used), usedBy: str(r.usedBy), usedAt: date(r.usedAt),
        createdBy: str(r.createdBy), expiresAt: date(r.expiresAt),
        createdAt: date(r.createdAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ Invite: ${backup.Invite.length}`);

  // ── UniformOrder ──────────────────────────────────────────────────────────
  for (const r of backup.UniformOrder) {
    await db.uniformOrder.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, parentId: r.parentId, playerId: r.playerId,
        type: r.type, jerseySize: r.jerseySize, shortsSize: r.shortsSize,
        nameOnJersey: r.nameOnJersey,
        numberOnJersey: num(r.numberOnJersey) !== null ? Number(r.numberOnJersey) : null,
        unitPrice: Number(r.unitPrice), totalPrice: Number(r.totalPrice),
        status: r.status ?? "PENDING", notes: str(r.notes),
        createdAt: date(r.createdAt) ?? new Date(),
        updatedAt: date(r.updatedAt) ?? new Date(),
      },
    });
  }
  console.log(`✅ UniformOrder: ${backup.UniformOrder.length}`);

  console.log("\n🎉 Importación completa. Todos los datos están en Neon.");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => db.$disconnect());
