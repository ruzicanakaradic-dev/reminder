"use client";

import { useEffect, useState } from "react";
import { Fuel, Loader2, Check, AlertTriangle, Save } from "lucide-react";
import { getSettingsAction, saveSettingsAction } from "@/app/actions";
import type { AppSettings } from "@/lib/types";

// Podešavanja troškova prevoza — Ružica menja cenu dizela (menja se nedeljno),
// potrošnju i amortizaciju. Trošak se zaključava na porudžbini pri čuvanju,
// pa promena ovde utiče samo na NOVE / izmenjene porudžbine.
export function TransportSettings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");

  useEffect(() => {
    getSettingsAction().then(setS).catch(() => setS(null));
  }, []);

  function field(key: keyof AppSettings, v: string) {
    if (!s) return;
    const n = parseFloat(v.replace(",", "."));
    setS({ ...s, [key]: isNaN(n) ? 0 : n });
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await saveSettingsAction(s);
      setS(saved);
      setTone("ok");
      setMsg("✓ Sačuvano. Nove porudžbine koriste ove vrednosti.");
    } catch {
      setTone("warn");
      setMsg("Greška pri čuvanju. Pokušaj ponovo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-ink font-semibold">
        <Fuel size={18} className="text-[var(--accent)]" /> Troškovi prevoza
      </div>
      <p className="text-sm text-muted -mt-2">
        Cena dizela se menja skoro svake nedelje (petkom) — ovde je ažuriraj. Trošak na već sačuvanim
        porudžbinama se ne menja.
      </p>

      {!s ? (
        <div className="flex items-center gap-2 text-muted text-sm"><Loader2 size={16} className="animate-spin" /> Učitavanje…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Cena dizela (RSD / l)</label>
              <input className="input" inputMode="decimal" value={s.dizel_cena_rsd}
                onChange={(e) => field("dizel_cena_rsd", e.target.value)} />
            </div>
            <div>
              <label className="label">Potrošnja (l / 100km)</label>
              <input className="input" inputMode="decimal" value={s.potrosnja_l_100km}
                onChange={(e) => field("potrosnja_l_100km", e.target.value)} />
            </div>
          </div>

          <button onClick={save} disabled={busy} className="btn btn-primary text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sačuvaj
          </button>

          {msg && (
            <div className={`text-sm font-medium flex items-start gap-1.5 ${tone === "warn" ? "text-red-600" : "text-[var(--accent)]"}`}>
              {tone === "warn" ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
              <span>{msg}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
