import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import fs from "fs";
import path from "path";

const uploadSchema = z.object({
  playerMissionId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  data: z.string(), // base64
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const playerId = searchParams.get("playerId") || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (playerId) where.playerId = playerId;

  const evidences = await db.evidence.findMany({
    where,
    include: {
      player: { include: { user: true } },
      playerMission: { include: { mission: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(evidences);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only players can upload evidence for their missions
  if (session.user.role !== "PLAYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { playerMissionId, filename, mimeType, data } = parsed.data;

  // find player profile for current user
  const player = await db.player.findUnique({ where: { userId: session.user.id } });
  if (!player) return NextResponse.json({ error: "Player profile not found" }, { status: 404 });

  // verify playerMission exists and belongs to player
  const pm = await db.playerMission.findUnique({ where: { id: playerMissionId } });
  if (!pm || pm.playerId !== player.id) return NextResponse.json({ error: "PlayerMission not found or not owner" }, { status: 404 });

  // create DB record first to get id
  const created = await db.evidence.create({
    data: {
      playerId: player.id,
      playerMissionId,
      url: "/uploads/evidence/pending",
      filename,
      mimeType,
      size: Buffer.from(data, "base64").length,
    },
  });

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "evidence");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const safeFilename = `${created.id}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadsDir, safeFilename);
  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(filePath, buffer);

  const urlPath = `/uploads/evidence/${safeFilename}`;
  const updated = await db.evidence.update({ where: { id: created.id }, data: { url: urlPath } });

  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // body can be { action: 'accept', id: string } or { action: 'reject', id } or { action: 'acceptAll' }
  if (!body || !body.action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  if (body.action === "acceptAll") {
    const pending = await db.evidence.findMany({
      where: { status: "PENDING" },
      include: { playerMission: { include: { mission: true } }, player: true },
    });

    for (const ev of pending) {
      try {
        await db.evidence.update({ where: { id: ev.id }, data: { status: "ACCEPTED", verifiedAt: new Date(), verifiedBy: session.user.id } });

        // award XP to player
        const xp = ev.playerMission?.mission?.xpReward || 0;
        if (xp > 0) {
          await db.player.update({ where: { id: ev.playerId }, data: { xp: { increment: xp }, lastActive: new Date() } });
        }

        // mark playerMission completed
        if (ev.playerMissionId) {
          await db.playerMission.update({ where: { id: ev.playerMissionId }, data: { status: "COMPLETED", completedAt: new Date() } });
        }

        // delete file from disk if exists
        if (ev.url) {
          const localPath = path.join(process.cwd(), "public", ev.url.replace(/^\//, ""));
          try { fs.unlinkSync(localPath); } catch (e) { /* ignore missing file */ }
        }
      } catch (e) {
        console.error("Failed to accept evidence", ev.id, e);
      }
    }

    return NextResponse.json({ ok: true, processed: pending.length });
  }

  if (body.action === "accept" || body.action === "reject") {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const ev = await db.evidence.findUnique({ where: { id }, include: { playerMission: { include: { mission: true } } } });
    if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
        try { fs.unlinkSync(localPath); } catch (e) { /* ignore missing file */ }
      }

      return NextResponse.json({ ok: true });
    } else {
      // reject
      await db.evidence.update({ where: { id }, data: { status: "REJECTED", verifiedAt: new Date(), verifiedBy: session.user.id } });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
