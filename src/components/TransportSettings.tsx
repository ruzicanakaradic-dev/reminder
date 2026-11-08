"use client";

import { useEffect, useState } from "react";
import { Fuel, Loader2, Check, AlertTriangle, Save, MapPin, Truck } from "lucide-react";
import { getSettingsAction, saveSettingsAction } from "@/app/actions";
import type { AppSettings } from "@/lib/types";
import { razumljivaPoruka } from "@/lib/greske";

// Podešavanja prevoza po korisnici: polazište (odakle kreće dostava), gorivo
// (tip + cena), potrošnja i prag besplatne dostave. Trošak se zaključava na
// porudžbini pri čuvanju, pa promena ovde utiče samo na NOVE / izmenjene.
export function TransportSettings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");

  useEffect(() => {
    getSettingsAction().then(setS).catch(() => setS(null));
  }, []);

  function num(key: keyof AppSettings, v: string) {
    if (!s) return;
    const n = parseFloat(v.replace(",", "."));
    setS({ ...s, [key]: isNaN(n) ? 0 : n });
  }

  // Geokodira unetu adresu polazišta → puni lat/lon.
  async function nadjiPolaziste() {
    if (!s || !s.polaziste_adresa.trim()) {
      setTone("warn");
      setMsg("Prvo upiši adresu polazišta.");
      return;
    }
    setGeoBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/geokod?q=${encodeURIComponent(s.polaziste_adresa)}`);
      const d = (await res.json().catch(() => ({}))) as {
        lat?: number;
        lon?: number;
        naziv?: string;
        error?: string;
      };
      if (res.ok && typeof d.lat === "number" && typeof d.lon === "number") {
        setS({ ...s, polaziste_lat: d.lat, polaziste_lon: d.lon });
        setTone("ok");
        setMsg(`✓ Polazište pronađeno: ${d.naziv ?? "koordinate upisane"}. Ne zaboravi da sačuvaš.`);
      } else {
        setTone("warn");
        setMsg(d.error ?? "Adresa polazišta nije pronađena. Probaj preciznije (mesto + ulica).");
      }
    } catch (err) {
      setTone("warn");
      setMsg(razumljivaPoruka(err));
    } finally {
      setGeoBusy(false);
    }
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await saveSettingsAction(s);
      if (res.ok) {
        setS(res.data);
        setTone("ok");
        setMsg("✓ Sačuvano. Nove porudžbine koriste ove vrednosti.");
      } else {
        setTone("warn");
        setMsg(`Nije sačuvano. ${res.greska}`);
      }
    } catch (err) {
      setTone("warn");
      setMsg(`Nije sačuvano. ${razumljivaPoruka(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const imaKoordinate = !!s && !!s.polaziste_lat && !!s.polaziste_lon;

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-2 text-ink font-semibold">
        <Truck size={18} className="text-[var(--accent)]" /> Dostava i troškovi prevoza
      </div>

      {!s ? (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Učitavanje…
        </div>
      ) : (
        <>
          {/* ── Polazište ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <MapPin size={15} className="text-[var(--accent)]" /> Polazište
            </div>
            <p className="text-sm text-muted -mt-1">
              Odakle kreće dostava. Na osnovu ovoga se računa kilometraža i putarina do kupca.
            </p>
            <label className="label">Adresa polazišta</label>
            <input
              className="input"
              placeholder="npr. Novi Sad, Bulevar oslobođenja 10"
              value={s.polaziste_adresa}
              onChange={(e) => setS({ ...s, polaziste_adresa: e.target.value })}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={nadjiPolaziste} disabled={geoBusy} className="btn btn-secondary text-sm">
                {geoBusy ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                Pronađi na mapi
              </button>
              <span className={`text-xs ${imaKoordinate ? "text-[var(--accent)]" : "text-muted"}`}>
                {imaKoordinate
                  ? `✓ Koordinate upisane (${s.polaziste_lat.toFixed(4)}, ${s.polaziste_lon.toFixed(4)})`
                  : "Koordinate još nisu upisane"}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border,#eee)]" />

          {/* ── Gorivo ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Fuel size={15} className="text-[var(--accent)]" /> Gorivo
            </div>
            <p className="text-sm text-muted -mt-1">
              Cena goriva se menja često — ovde je ažuriraj. Trošak na već sačuvanim porudžbinama se ne menja.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tip goriva</label>
                <select
                  className="input"
                  value={s.tip_goriva}
                  onChange={(e) =>
                    setS({ ...s, tip_goriva: e.target.value === "benzin" ? "benzin" : "dizel" })
                  }
                >
                  <option value="dizel">Dizel</option>
                  <option value="benzin">Benzin</option>
                </select>
              </div>
              <div>
                <label className="label">Cena goriva (RSD / l)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={s.gorivo_cena_rsd}
                  onChange={(e) => num("gorivo_cena_rsd", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Potrošnja (l / 100km)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={s.potrosnja_l_100km}
                  onChange={(e) => num("potrosnja_l_100km", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border,#eee)]" />

          {/* ── Besplatna dostava ── */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-ink">Prag besplatne dostave</div>
            <p className="text-sm text-muted -mt-1">
              Porudžbine (torte/kolači) iznad ovog iznosa dobijaju besplatnu dostavu. Upiši 0 ako nemaš
              besplatnu dostavu.
            </p>
            <label className="label">Prag (RSD)</label>
            <input
              className="input"
              inputMode="decimal"
              value={s.besplatna_dostava_od}
              onChange={(e) => num("besplatna_dostava_od", e.target.value)}
            />
          </div>

          <button onClick={save} disabled={busy} className="btn btn-primary text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sačuvaj
          </button>

          {msg && (
            <div
              className={`text-sm font-medium flex items-start gap-1.5 ${
                tone === "warn" ? "text-red-600" : "text-[var(--accent)]"
              }`}
            >
              {tone === "warn" ? (
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              ) : (
                <Check size={15} className="mt-0.5 shrink-0" />
              )}
              <span>{msg}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
