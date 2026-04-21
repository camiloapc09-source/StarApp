"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export default function PushButton() {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported"); return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      });
    });
  }, []);

  async function toggle() {
    const reg = await navigator.serviceWorker.ready;

    if (state === "subscribed") {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setState("denied"); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
    });

    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: arrayBufferToBase64(sub.getKey("p256dh")!), auth: arrayBufferToBase64(sub.getKey("auth")!) } }),
    });

    setState("subscribed");
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <button
      onClick={toggle}
      title={state === "subscribed" ? "Desactivar notificaciones" : "Activar notificaciones push"}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={{
        background: state === "subscribed" ? "rgba(52,211,153,0.12)" : "rgba(139,92,246,0.12)",
        border: `1px solid ${state === "subscribed" ? "rgba(52,211,153,0.25)" : "rgba(139,92,246,0.25)"}`,
        color: state === "subscribed" ? "#34D399" : state === "denied" ? "var(--text-muted)" : "#A78BFA",
      }}
    >
      {state === "subscribed" ? <Bell size={13} /> : <BellOff size={13} />}
      {state === "subscribed" ? "Notificaciones activas" : state === "denied" ? "Bloqueadas" : "Activar alertas"}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
