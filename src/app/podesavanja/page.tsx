"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Loader2, BellRing, Check } from "lucide-react";
import { PageHeader } from "@/components/ui";

export default function PodesavanjaPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enableNotifs() {
    setMsg(null);
    if (!("Notification" in window)) {
      setMsg("Ovaj uređaj ne podržava notifikacije.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
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
      setMsg("✓ Notifikacije su uključene.");
    } else {
      setMsg("Notifikacije su odbijene u pregledaču.");
    }
  }

  async function testPush() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json();
      setMsg(res.ok ? `✓ Poslato na ${d.sent} uređaj(a).` : d.error || "Greška.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/prijava", { method: "DELETE" });
    router.replace("/prijava");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Podešavanja" />

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <Bell size={18} className="text-rose-500" /> Notifikacije
        </div>
        <p className="text-sm text-muted">
          Uključi zvučne podsetnike na ovom uređaju (2 dana i dan pre isporuke).
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={enableNotifs} className="btn btn-primary text-sm">
            <BellRing size={16} /> Uključi notifikacije
          </button>
          <button onClick={testPush} disabled={busy} className="btn btn-ghost text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Pošalji test
          </button>
        </div>
        {msg && <div className="text-sm font-medium text-rose-600">{msg}</div>}
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-ink font-semibold">Instalacija na telefon</div>
        <p className="text-sm text-muted">
          <b>Android (Chrome):</b> meni ⋮ → „Dodaj na početni ekran".
          <br />
          <b>iPhone (Safari):</b> Podeli (kvadrat sa strelicom) → „Add to Home Screen".
          Notifikacije na iPhone-u rade tek kad se aplikacija doda na početni ekran.
        </p>
      </div>

      <button onClick={logout} className="btn btn-ghost text-rose-600 w-full">
        <LogOut size={18} /> Odjavi se
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
