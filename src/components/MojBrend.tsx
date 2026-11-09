"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle, Save, Palette, Upload, Trash2, RotateCcw } from "lucide-react";
import {
  getSettingsAction,
  saveSettingsAction,
  getBrendAction,
  uploadBrendLogoAction,
  removeBrendLogoAction,
} from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";
import { applyBrandColor } from "@/components/BrandStyle";

// Brend KORISNICE (nivo 2): njen naziv, boja i logo. Nezavisno od Trust
// identiteta. Primenjuje se na njen radni prostor (top bar, akcenti, porudžbine).

const PALETA = ["#7a3785", "#be123c", "#c2410c", "#15803d", "#0369a1", "#1e1b4b"];
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function MojBrend() {
  const [naziv, setNaziv] = useState("");
  const [boja, setBoja] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ucitano, setUcitano] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.allSettled([getSettingsAction(), getBrendAction()]).then(([s, b]) => {
      if (s.status === "fulfilled") {
        setNaziv(s.value.naziv_biznisa ?? "");
        setBoja(s.value.brend_boja ?? "");
      }
      if (b.status === "fulfilled") setLogoUrl(b.value.logoUrl);
      setUcitano(true);
    });
  }, []);

  const bojaZaPrikaz = HEX.test(boja) ? boja : "#7a3785";
  const inicijal = (naziv.trim()[0] ?? "B").toUpperCase();
  // Prilagođena boja = važeći hex koji NIJE među presetovima.
  const jeCustom = HEX.test(boja) && !PALETA.includes(boja.toLowerCase());

  function say(text: string, t: "ok" | "warn" = "ok") {
    setTone(t);
    setMsg(text);
  }

  // Izbor boje: ODMAH primeni na radni prostor (živi pregled, kontrast-sigurno)
  // i zapamti; „Sačuvaj brend" tek trajno upisuje u bazu.
  function izaberiBoju(c: string) {
    setBoja(c);
    applyBrandColor(c);
  }
  // Reset na podrazumevanu (Trust) boju.
  function resetBoju() {
    setBoja("");
    applyBrandColor(null);
  }

  async function sacuvaj() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await saveSettingsAction({ naziv_biznisa: naziv, brend_boja: boja });
      if (res.ok) {
        say("✓ Sačuvano. Tvoj brend se primenjuje u aplikaciji.");
        applyBrandColor(boja);
      } else {
        say(`Nije sačuvano. ${res.greska}`, "warn");
      }
    } catch (err) {
      say(`Nije sačuvano. ${razumljivaPoruka(err)}`, "warn");
    } finally {
      setBusy(false);
    }
  }

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // dozvoli ponovni izbor iste datoteke
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await uploadBrendLogoAction(fd);
      if (res.ok) {
        setLogoUrl(res.data.logoUrl);
        say("✓ Logo otpremljen. Pojavljuje se u tvojoj aplikaciji.");
      } else {
        say(`Nije otpremljeno. ${res.greska}`, "warn");
      }
    } catch (err) {
      say(`Nije otpremljeno. ${razumljivaPoruka(err)}`, "warn");
    } finally {
      setUploading(false);
    }
  }

  async function ukloniLogo() {
    setUploading(true);
    setMsg(null);
    try {
      const res = await removeBrendLogoAction();
      if (res.ok) {
        setLogoUrl(null);
        say("Logo uklonjen.");
      } else {
        say(`Nije uklonjeno. ${res.greska}`, "warn");
      }
    } catch (err) {
      say(`Nije uklonjeno. ${razumljivaPoruka(err)}`, "warn");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-2 text-ink font-semibold">
        <Palette size={18} style={{ color: "var(--brand)" }} /> Moj brend
      </div>
      <p className="text-sm text-muted -mt-2">
        Tvoj logo, naziv i boja — pojavljuju se u <b>tvojoj</b> aplikaciji i na porudžbinama. Nezavisno od
        izgleda same aplikacije.
      </p>

      {!ucitano ? (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Učitavanje…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {/* Logo ili obojeni inicijal */}
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="rounded-2xl object-cover shrink-0 border border-[var(--divider)]"
                style={{ width: 64, height: 64 }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-2xl text-white font-bold shrink-0"
                style={{ width: 64, height: 64, background: bojaZaPrikaz, fontSize: 26 }}
              >
                {inicijal}
              </div>
            )}
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

          {/* Logo kontrole */}
          <div className="space-y-2">
            <label className="label">Logo</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onLogoPick}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn btn-secondary text-sm"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {logoUrl ? "Promeni logo" : "Otpremi logo"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={ukloniLogo}
                  disabled={uploading}
                  className="btn btn-ghost text-sm text-red-600"
                >
                  <Trash2 size={16} /> Ukloni
                </button>
              )}
            </div>
            <p className="text-xs text-muted">PNG ili JPG, do 2 MB. Ako nema logoa, koristi se obojeni inicijal.</p>
          </div>

          <div className="space-y-2">
            <label className="label">Boja brenda</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => izaberiBoju(c)}
                  aria-label={`Boja ${c}`}
                  className="rounded-[10px] transition-transform"
                  style={{
                    width: 38,
                    height: 38,
                    background: c,
                    boxShadow: boja.toLowerCase() === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
              {/* Prilagođena boja: kad je izabrana, polje se oboji njome i markira
                  kao izabrano; inače prikazuje „+". Klik otvara biranje boje. */}
              <label
                className="rounded-[10px] flex items-center justify-center cursor-pointer text-muted"
                style={{
                  width: 38,
                  height: 38,
                  background: jeCustom ? boja : "transparent",
                  border: jeCustom ? "none" : "1px dashed var(--divider)",
                  color: jeCustom ? "#fff" : "var(--neutral-600)",
                  boxShadow: jeCustom ? `0 0 0 2px var(--surface), 0 0 0 4px ${boja}` : "none",
                }}
                title="Prilagođena boja"
              >
                <input
                  type="color"
                  value={bojaZaPrikaz}
                  onChange={(e) => izaberiBoju(e.target.value)}
                  className="sr-only"
                />
                {jeCustom ? null : "+"}
              </label>
            </div>
            <p className="text-xs text-muted">Dugmad, akcenti i oznake u tvojoj aplikaciji koriste ovu boju.</p>
            {HEX.test(boja) && (
              <button
                type="button"
                onClick={resetBoju}
                className="btn btn-ghost text-sm !px-2"
              >
                <RotateCcw size={15} /> Vrati podrazumevanu boju
              </button>
            )}
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
