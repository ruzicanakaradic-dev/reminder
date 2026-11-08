"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, AlertTriangle, Save, Palette } from "lucide-react";
import { getSettingsAction, saveSettingsAction } from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";

// Brend KORISNICE (nivo 2): njen naziv + boja. Nezavisno od Trust identiteta.
// Boja se primenjuje na njen radni prostor (top bar, akcenti, porudžbine).
// (Upload logoa dolazi kao sledeći korak — zahteva fajl endpoint.)

const PALETA = ["#7a3785", "#be123c", "#c2410c", "#15803d", "#0369a1", "#1e1b4b"];

export function MojBrend() {
  const [naziv, setNaziv] = useState("");
  const [boja, setBoja] = useState("");
  const [ucitano, setUcitano] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");

  useEffect(() => {
    getSettingsAction()
      .then((s) => {
        setNaziv(s.naziv_biznisa ?? "");
        setBoja(s.brend_boja ?? "");
        setUcitano(true);
      })
      .catch(() => setUcitano(true));
  }, []);

  const bojaZaPrikaz = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(boja) ? boja : "#7a3785";
  const inicijal = (naziv.trim()[0] ?? "B").toUpperCase();

  async function sacuvaj() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await saveSettingsAction({ naziv_biznisa: naziv, brend_boja: boja });
      if (res.ok) {
        setTone("ok");
        setMsg("✓ Sačuvano. Tvoj brend se primenjuje u aplikaciji.");
        // Osveži boju na radnom prostoru odmah.
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(boja)) {
          document.documentElement.style.setProperty("--brand", boja);
        } else {
          document.documentElement.style.removeProperty("--brand");
        }
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

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-2 text-ink font-semibold">
        <Palette size={18} style={{ color: "var(--brand)" }} /> Moj brend
      </div>
      <p className="text-sm text-muted -mt-2">
        Tvoj naziv i boja — pojavljuju se u <b>tvojoj</b> aplikaciji i na porudžbinama. Nezavisno od
        izgleda same aplikacije.
      </p>

      {!ucitano ? (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Učitavanje…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-2xl text-white font-bold shrink-0"
              style={{ width: 64, height: 64, background: bojaZaPrikaz, fontSize: 26 }}
            >
              {inicijal}
            </div>
            <div className="flex-1">
              <label className="label">Naziv biznisa</label>
              <input
                className="input"
                value={naziv}
                onChange={(e) => setNaziv(e.target.value)}
                placeholder="npr. Milkine torte"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Boja brenda</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBoja(c)}
                  aria-label={`Boja ${c}`}
                  className="rounded-[10px] transition-transform"
                  style={{
                    width: 38,
                    height: 38,
                    background: c,
                    boxShadow: boja.toLowerCase() === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
              <label
                className="rounded-[10px] border border-dashed border-[var(--divider)] flex items-center justify-center cursor-pointer text-muted"
                style={{ width: 38, height: 38 }}
                title="Prilagođena boja"
              >
                <input
                  type="color"
                  value={bojaZaPrikaz}
                  onChange={(e) => setBoja(e.target.value)}
                  className="sr-only"
                />
                +
              </label>
            </div>
            <p className="text-xs text-muted">Dugmad, akcenti i oznake u tvojoj aplikaciji koriste ovu boju.</p>
          </div>

          <button onClick={sacuvaj} disabled={busy} className="btn btn-primary text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sačuvaj brend
          </button>

          {msg && (
            <div
              className={`text-sm font-medium flex items-start gap-1.5 ${
                tone === "warn" ? "text-red-600" : "text-[var(--brand)]"
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
