import webpush from "web-push";
import { db } from "@/lib/db";

/**
 * Las claves VAPID se configuran solo si están COMPLETAS.
 *
 * Antes se llamaba a `setVapidDetails` al cargar el módulo usando `??`, que no
 * protege contra una cadena vacía: con `VAPID_EMAIL=` en el entorno, la llamada
 * lanzaba "No subject set in vapidDetails.subject" y tumbaba el build entero y
 * el arranque del servidor. Sin claves, el push simplemente no se envía.
 */
const vapidEmail      = process.env.VAPID_EMAIL?.trim() || "";
const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";

const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  try {
    webpush.setVapidDetails(
      vapidEmail.startsWith("mailto:") || vapidEmail.startsWith("https://")
        ? vapidEmail
        : vapidEmail
          ? `mailto:${vapidEmail}`
          : "mailto:admin@starclub.com",
      vapidPublicKey,
      vapidPrivateKey,
    );
  } catch (err) {
    console.error("Web push deshabilitado — claves VAPID inválidas:", err);
  }
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!pushEnabled) return;

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
