"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Check, MapPin, Phone } from "lucide-react";
import { relativnoDana, formatDatum } from "@/lib/format";

type Item = {
  id: string;
  redni_broj: number;
  kupac_ime: string;
  proizvod: string;
  grad: string | null;
  adresa: string | null;
  datum_isporuke: string;
  status: string;
  dana: number;
};

const POLL_MS = 3 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function ackKey(id: string, dana: number) {
  // potvrda važi za taj dan i taj "prag" (2/1/0/kasni)
  const prag = dana >= 2 ? "2d" : dana === 1 ? "1d" : dana === 0 ? "0d" : "late";
  return `rdk_ack:${todayKey()}:${id}:${prag}`;
}

export function ReminderWatcher() {
  const [due, setDue] = useState<Item[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const soundTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlocked = useRef(false);

  // Otključaj zvuk na prvi dodir (browser politika autoplay-a)
  useEffect(() => {
    const unlock = () => {
      if (unlocked.current) return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx.current = new Ctx();
        unlocked.current = true;
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const chime = useCallback(() => {
    const ctx = audioCtx.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1174.7].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, []);

  const startAlarm = useCallback(() => {
    if (soundTimer.current) return;
    chime();
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    soundTimer.current = setInterval(() => {
      chime();
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    }, 2500);
  }, [chime]);

  const stopAlarm = useCallback(() => {
    if (soundTimer.current) {
      clearInterval(soundTimer.current);
      soundTimer.current = null;
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[] };
      const nepotvrdjene = data.items.filter(
        (it) => localStorage.getItem(ackKey(it.id, it.dana)) === null
      );
      setDue(nepotvrdjene);
    } catch {
      /* offline — ignoriši */
    }
  }, []);

  useEffect(() => {
    check();
    const iv = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [check]);

  useEffect(() => {
    if (due.length > 0) startAlarm();
    else stopAlarm();
    return stopAlarm;
  }, [due, startAlarm, stopAlarm]);

  const potvrdi = (it: Item) => {
    localStorage.setItem(ackKey(it.id, it.dana), "1");
    setDue((prev) => prev.filter((x) => x.id !== it.id));
  };
  const potvrdiSve = () => {
    due.forEach((it) => localStorage.setItem(ackKey(it.id, it.dana), "1"));
    setDue([]);
  };

  if (due.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm animate-in">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white px-5 py-4 flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-white/20 pulse-ring">
            <BellRing size={22} />
          </span>
          <div>
            <div className="font-bold text-lg leading-tight">Podsetnik za isporuku!</div>
            <div className="text-white/85 text-sm">
              {due.length} {due.length === 1 ? "porudžbina zahteva" : "porudžbine/a zahtevaju"} pažnju
            </div>
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto divide-y divide-line no-scrollbar">
          {due.map((it) => (
            <div key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{it.proizvod}</div>
                  <div className="text-sm text-muted truncate">za {it.kupac_ime}</div>
                  <div className="mt-1 text-sm">
                    <span
                      className="font-bold"
                      style={{ color: it.dana < 0 ? "#cf3468" : "var(--rose-600)" }}
                    >
                      Isporuka {relativnoDana(it.dana)}
                    </span>{" "}
                    <span className="text-muted">· {formatDatum(it.datum_isporuke)}</span>
                  </div>
                  {(it.grad || it.adresa) && (
                    <div className="mt-1 text-xs text-muted flex items-center gap-1">
                      <MapPin size={13} /> {[it.adresa, it.grad].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => potvrdi(it)}
                  className="btn btn-soft text-sm shrink-0"
                  aria-label="Potvrdi"
                >
                  <Check size={16} /> Potvrdi
                </button>
              </div>
              <div className="mt-2">
                <Link
                  href={`/porudzbine/${it.id}`}
                  onClick={() => potvrdi(it)}
                  className="text-sm font-semibold text-rose-600 underline underline-offset-2"
                >
                  Otvori porudžbinu →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-line">
          <button onClick={potvrdiSve} className="btn btn-primary w-full">
            <Check size={18} /> Potvrđujem sve
          </button>
        </div>
      </div>
    </div>
  );
}
