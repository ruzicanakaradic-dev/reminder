"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const cleaned = base64String.replace(/\s/g, "");
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushSetup() {
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        if (!("PushManager" in window) || !("Notification" in window)) return;
        if (Notification.permission === "granted") {
          await subscribe(reg);
        } else if (Notification.permission === "default") {
          setNeedsPrompt(true);
        }
      })
      .catch(() => {});
  }, []);

  async function subscribe(reg: ServiceWorkerRegistration) {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } catch {
      /* ignore */
    }
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        await subscribe(reg);
      }
      setNeedsPrompt(false);
    } finally {
      setBusy(false);
    }
  }

  if (!needsPrompt) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm animate-in">
      <div className="card p-3.5 flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-[var(--accent-100)] text-[var(--accent)] shrink-0">
          <Bell size={20} />
        </span>
        <div className="text-sm leading-snug flex-1">
          <div className="font-semibold text-ink">Uključi podsetnike na telefonu</div>
          <div className="text-muted text-xs">Zvučna notifikacija 2 dana i dan pre isporuke.</div>
        </div>
        <button onClick={enable} disabled={busy} className="btn btn-primary text-sm shrink-0">
          {busy ? "…" : "Uključi"}
        </button>
        <button
          onClick={() => setNeedsPrompt(false)}
          className="text-muted shrink-0"
          aria-label="Zatvori"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
