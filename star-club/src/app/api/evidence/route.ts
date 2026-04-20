import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { requireAuth, requireRole, getClubId, isResponse, apiError, apiOk, rateLimit } from "@/lib/api";

const uploadSchema = z.object({
  playerMissionId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  data: z.string(), // base64
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") || undefined;
  const playerId = searchParams.get("playerId") || undefined;

  const evidences = await db.evidence.findMany({
    where: {
      player: { clubId },
      ...(status ? { status } : {}),
      ...(playerId ? { playerId } : {}),
    },
    include: {
      player: { include: { user: true } },
      playerMission: { include: { mission: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return apiOk(evidences);
}

export async function POST(req: NextRequest) {
  const session = await requireRole(["PLAYER"]);
  if (isResponse(session)) return session;

  if (!rateLimit(`evidence:${session.user.id}`, 10, 60_000)) return apiError("Too many uploads", 429);

  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  const { playerMissionId, filename, mimeType, data } = parsed.data;

  const player = await db.player.findUnique({ where: { userId: session.user.id } });
  if (!player) return apiError("Player profile not found", 404);

  const pm = await db.playerMission.findUnique({ where: { id: playerMissionId } });
  if (!pm || pm.playerId !== player.id) return apiError("PlayerMission not found or not owner", 404);

  const created = await db.evidence.create({
    data: {
      playerId: player.id,
      playerMissionId,
      url: "/uploads/evidence/pending",
      filename, mimeType,
      size: Buffer.from(data, "base64").length,
    },
  });

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "evidence");
  fs.mkdirSync(uploadsDir, { recursive: true });

  // Use a random token to prevent filename enumeration (not the evidence ID)
  const token = randomBytes(12).toString("hex");
  const ext = filename.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const safeFilename = `ev-${token}.${ext}`;
  const filePath = path.join(uploadsDir, safeFilename);
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));

  const urlPath = `/uploads/evidence/${safeFilename}`;
  const updated = await db.evidence.update({ where: { id: created.id }, data: { url: urlPath } });

  return apiOk(updated);
}

export async function PATCH(req: NextRequest) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;
  const clubId = getClubId(session);

  const body = await req.json();
  if (!body || !body.action) return apiError("Missing action", 400);

  if (body.action === "acceptAll") {
    const pending = await db.evidence.findMany({
      where: { status: "PENDING", player: { clubId } },
      include: { playerMission: { include: { mission: true } }, player: true },
    });

    for (const ev of pending) {
      try {
        await db.evidence.update({
          where: { id: ev.id },
          data: { status: "ACCEPTED", verifiedAt: new Date(), verifiedBy: session.user.id },
        });

        const xp = ev.playerMission?.mission?.xpReward || 0;
        if (xp > 0) {
          await db.player.update({ where: { id: ev.playerId }, data: { xp: { increment: xp }, lastActive: new Date() } });
        }

        if (ev.playerMissionId) {
          await db.playerMission.update({ where: { id: ev.playerMissionId }, data: { status: "COMPLETED", completedAt: new Date() } });
        }

        if (ev.url) {
          const localPath = path.join(process.cwd(), "public", ev.url.replace(/^\//, ""));
          try { fs.unlinkSync(localPath); } catch { /* ignore missing file */ }
        }
      } catch (e) {
        console.error("Failed to accept evidence", ev.id, e);
      }
    }

    return apiOk({ ok: true, processed: pending.length });
  }

  if (body.action === "accept" || body.action === "reject") {
    const id = body.id;
    if (!id) return apiError("Missing id", 400);

    const ev = await db.evidence.findUnique({
      where: { id },
      include: { playerMission: { include: { mission: true } }, player: { select: { clubId: true } } },
    });
    if (!ev || ev.player.clubId !== clubId) return apiError("Not found", 404);

    if (body.action === "accept") {
      await db.evidence.update({ where: { id }, data: { status: "ACCEPTED", verifiedAt: new Date(), verifiedBy: session.user.id } });

      const xp = ev.playerMission?.mission?.xpReward || 0;
      if (xp > 0) {
        await db.player.update({ where: { id: ev.playerId }, data: { xp: { increment: xp }, lastActive: new Date() } });
      }

      if (ev.playerMissionId) {
        await db.playerMission.update({ where: { id: ev.playerMissionId }, data: { status: "COMPLETED", completedAt: new Date() } });
      }

      if (ev.url) {
        const localPath = path.join(process.cwd(), "public", ev.url.replace(/^\//, ""));
        try { fs.unlinkSync(localPath); } catch { /* ignore */ }
      }

      return apiOk({ ok: true });
    } else {
      await db.evidence.update({ where: { id }, data: { status: "REJECTED", verifiedAt: new Date(), verifiedBy: session.user.id } });
      return apiOk({ ok: true });
    }
  }

  return apiError("Unsupported action", 400);
}
