import webpush from "web-push";
import { db } from "@/lib/db";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "mailto:admin@starclub.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const subs = await db.pushSubscription.findMany({ where: { userId } });
  const data = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data);
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        if (err && typeof err === "object" && "statusCode" in err && (err.statusCode === 410 || err.statusCode === 404)) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}

export async function sendPushToClub(clubId: string, roles: string[], payload: { title: string; body: string; url?: string }) {
  const users = await db.user.findMany({ where: { clubId, role: { in: roles } }, select: { id: true } });
  await Promise.allSettled(users.map((u) => sendPushToUser(u.id, payload)));
}
