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

  function beep() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [880, 1174.7].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    } catch {
      /* ignore */
    }
  }

  async function testPush() {
    setBusy(true);
    setMsg(null);
    // Zvučni signal odmah (klik je korisnička radnja — dozvoljeno je puštanje zvuka)
    beep();
    try {
      // Lokalna notifikacija preko service worker-a (pouzdanije od servera)
      if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("🌹 Test podsetnik", {
          body: "Ovako izgleda podsetnik za isporuku.",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "test",
          requireInteraction: true,
          ...( { vibrate: [200, 100, 200, 100, 200] } as NotificationOptions ),
        });
      }
      // I preko servera (za slučaj kad je app zatvorena)
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      setMsg(
        res.ok
          ? `✓ Test poslat. Ako ne čuješ zvuk na iPhone-u, vidi napomenu ispod.`
          : d.error || "Notifikacija prikazana lokalno."
      );
    } catch {
      setMsg("Zvuk odsviran. Za notifikaciju uključi dozvolu iznad.");
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
          <Bell size={18} className="text-[var(--accent)]" /> Notifikacije
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
        {msg && <div className="text-sm font-medium text-[var(--accent)]">{msg}</div>}
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-ink font-semibold">Instalacija na telefon</div>
        <p className="text-sm text-muted">
          <b>Android (Chrome):</b> meni ⋮ → „Dodaj na početni ekran".
          <br />
          <b>iPhone (Safari):</b> Podeli (kvadrat sa strelicom) → „Add to Home Screen".
        </p>
      </div>

      <div className="card p-5 space-y-2" style={{ borderLeft: "4px solid var(--accent)" }}>
        <div className="text-ink font-semibold">📣 Zvuk na iPhone-u — važno</div>
        <p className="text-sm text-muted">
          iPhone <b>ne pušta zvuk notifikacije dok je aplikacija otvorena u prvom planu</b> — to je
          Apple pravilo. Da čuješ zvuk:
        </p>
        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>Aplikacija mora biti <b>dodata na početni ekran</b> i otvorena odatle (ne iz Safari-ja).</li>
          <li>Telefon <b>ne sme biti na „Ne uznemiravaj"/Fokus</b> ni na tihom (proveri bočni prekidač).</li>
          <li>Za test: pritisni „Pošalji test", pa <b>zaključaj telefon</b> ili izađi na početni ekran —
            zvuk stiže kad app nije u prvom planu.</li>
          <li>U <b>Podešavanja → Obaveštenja → Ružini kolači</b> uključi „Zvukove".</li>
        </ul>
        <p className="text-sm text-muted">
          Dugme „Pošalji test" ovde <b>odsvira i kratak zvučni signal u aplikaciji</b> (ako telefon nije na tihom).
        </p>
      </div>

      <button onClick={logout} className="btn btn-ghost text-[var(--accent)] w-full">
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
