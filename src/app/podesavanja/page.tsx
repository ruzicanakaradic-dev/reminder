"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Loader2, BellRing, Check, Lock, Volume2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui";

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export default function PodesavanjaPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");
  const [busy, setBusy] = useState<null | "enable" | "test" | "sound">(null);
  const [status, setStatus] = useState<Status>("loading");

  // Očitaj trenutno stanje: dozvola + da li postoji sačuvana pretplata
  const refreshStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(Notification.permission === "granted" && sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  function say(text: string, t: "ok" | "warn" = "ok") {
    setTone(t);
    setMsg(text);
  }

  async function enableNotifs() {
    setBusy("enable");
    setMsg(null);
    try {
      if (!("Notification" in window)) {
        say("Ovaj uređaj ne podržava notifikacije.", "warn");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        say(
          "Notifikacije su odbijene. Uključi ih ručno: Podešavanja telefona → Obaveštenja → Ružini kolači.",
          "warn"
        );
        await refreshStatus();
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").replace(/\s/g, "");
      if (!key) {
        say("Nedostaje VAPID javni ključ u aplikaciji (nije u produkcionom build-u).", "warn");
        return;
      }
      const appServerKey = urlBase64ToUint8Array(key);
      if (appServerKey.length !== 65) {
        say(
          `VAPID javni ključ je neispravan (dekodira se u ${appServerKey.length} umesto 65 bajtova). Proveri vrednost u Vercel produkciji.`,
          "warn"
        );
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        say("Pretplata nije sačuvana na serveru. Pokušaj ponovo.", "warn");
      } else {
        say("✓ Notifikacije su uključene na ovom uređaju.");
      }
      await refreshStatus();
    } catch (err) {
      say(err instanceof Error ? err.message : "Greška pri uključivanju notifikacija. Pokušaj ponovo.", "warn");
    } finally {
      setBusy(null);
    }
  }

  // Šalje ISKLJUČIVO server push (bez lokalne notifikacije) — pravi test za zaključan ekran
  async function testLocked() {
    setBusy("test");
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        configured?: boolean;
        sent?: number;
        total?: number;
        removed?: number;
        reason?: string;
        error?: string;
      };

      if (d.configured === false) {
        say(
          "Server nema VAPID ključeve (produkcija). Push se ne može poslati dok se ne dodaju u Vercel env.",
          "warn"
        );
      } else if (d.ok && (d.total ?? 0) === 0) {
        say('Nema sačuvane pretplate. Prvo pritisni „Uključi notifikacije", pa ponovo testiraj.', "warn");
      } else if (d.ok && (d.sent ?? 0) === 0) {
        say(
          'Pretplata je istekla ili je pregledač odbio. Pritisni „Uključi notifikacije" da je obnoviš.',
          "warn"
        );
      } else if (d.ok) {
        say(
          `✓ Poslato na ${d.sent} uređaj(a). Zaključaj telefon — notifikacija treba da iskoči na ekranu.`
        );
      } else {
        say(d.reason || d.error || "Nije uspelo slanje push notifikacije.", "warn");
      }
    } catch {
      say("Nema veze sa serverom. Proveri internet i pokušaj ponovo.", "warn");
    } finally {
      setBusy(null);
    }
  }

  // Probni zvuk + lokalna notifikacija (radi samo dok je app u prvom planu)
  async function testSound() {
    setBusy("sound");
    setMsg(null);
    beep();
    try {
      if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("🌹 Probni zvuk", {
          body: "Ovako izgleda podsetnik za isporuku.",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "test-local",
          requireInteraction: true,
          ...({ vibrate: [200, 100, 200, 100, 200] } as NotificationOptions),
        });
      }
      say("Zvuk odsviran. (Na iPhone-u zvuk radi samo kad app NIJE u prvom planu.)");
    } catch {
      say("Zvuk odsviran.");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await fetch("/api/prijava", { method: "DELETE" });
    router.replace("/prijava");
    router.refresh();
  }

  const statusBadge = {
    loading: { text: "Provera…", cls: "text-muted" },
    unsupported: { text: "Nije podržano na ovom uređaju", cls: "text-muted" },
    denied: { text: "Blokirano u podešavanjima telefona", cls: "text-red-600" },
    off: { text: "Isključeno", cls: "text-muted" },
    on: { text: "✓ Uključeno", cls: "text-[var(--accent)]" },
  }[status];

  return (
    <div className="space-y-5">
      <PageHeader title="Podešavanja" />

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <Bell size={18} className="text-[var(--accent)]" /> Notifikacije
          </div>
          <span className={`text-sm font-semibold ${statusBadge.cls}`}>{statusBadge.text}</span>
        </div>
        <p className="text-sm text-muted">
          Podsetnik stiže <b>i kad je telefon zaključan</b> — 2 dana i dan pre isporuke.
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={enableNotifs} disabled={busy !== null} className="btn btn-primary text-sm">
            {busy === "enable" ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
            {status === "on" ? "Obnovi pretplatu" : "Uključi notifikacije"}
          </button>
          <button onClick={testLocked} disabled={busy !== null} className="btn btn-secondary text-sm">
            {busy === "test" ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Testiraj na zaključanom ekranu
          </button>
          <button onClick={testSound} disabled={busy !== null} className="btn btn-ghost text-sm">
            {busy === "sound" ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
            Probaj zvuk
          </button>
        </div>

        {msg && (
          <div
            className={`text-sm font-medium flex items-start gap-1.5 ${
              tone === "warn" ? "text-red-600" : "text-[var(--accent)]"
            }`}
          >
            {tone === "warn" ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
            <span>{msg}</span>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-2" style={{ borderLeft: "4px solid var(--accent)" }}>
        <div className="text-ink font-semibold">📣 Kako da testiraš zaključan ekran</div>
        <ol className="text-sm text-muted list-decimal pl-5 space-y-1">
          <li>Pritisni <b>„Uključi notifikacije"</b> i dozvoli obaveštenja.</li>
          <li>Pritisni <b>„Testiraj na zaključanom ekranu"</b>.</li>
          <li><b>Odmah zaključaj telefon</b> (dugme sa strane) i sačekaj koji sekund.</li>
          <li>Notifikacija treba da iskoči na zaključanom ekranu, sa zvukom.</li>
        </ol>
        <p className="text-sm text-muted">
          Ako poruka iznad kaže <b>„Poslato na 0 uređaj(a)"</b> ili da fali pretplata — pritisni „Uključi
          notifikacije" pa probaj ponovo.
        </p>
      </div>

      <div className="card p-5 space-y-2">
        <div className="text-ink font-semibold">iPhone — obavezna podešavanja</div>
        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>App mora biti <b>dodata na početni ekran</b> i otvorena odatle (ne iz Safari-ja).</li>
          <li>Telefon <b>ne sme biti na „Ne uznemiravaj"/Fokus</b> ni na tihom (proveri bočni prekidač).</li>
          <li>
            U <b>Podešavanja telefona → Obaveštenja → Ružini kolači</b> uključi „Dozvoli obaveštenja",
            „Zaključani ekran" i „Zvukove".
          </li>
        </ul>
      </div>

      <button onClick={logout} className="btn btn-ghost text-[var(--accent)] w-full">
        <LogOut size={18} /> Odjavi se
      </button>
    </div>
  );
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
