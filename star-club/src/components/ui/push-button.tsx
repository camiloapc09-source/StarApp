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
      title={state === "subscribed" ? "Desactivar notificaciones" : state === "denied" ? "Notificaciones bloqueadas en el navegador" : "Activar notificaciones"}
      className="relative p-2.5 rounded-lg transition-all"
      style={{
        background: state === "subscribed" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${state === "subscribed" ? "rgba(52,211,153,0.30)" : "rgba(255,255,255,0.08)"}`,
        color: state === "subscribed" ? "#34D399" : state === "denied" ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.45)",
      }}
    >
      {state === "subscribed" ? <Bell size={16} /> : <BellOff size={16} />}
      {state === "subscribed" && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
      )}
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
