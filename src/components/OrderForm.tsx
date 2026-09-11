"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ImagePlus, X, Plus, Trash2, Truck } from "lucide-react";
import { saveOrderAction } from "@/app/actions";
import { STATUS_LABEL, STATUS_ORDER, type AppSettings, type Order, type Status } from "@/lib/types";
import { formatRSD, toISODate } from "@/lib/format";
import { DEFAULT_SETTINGS, obracunajTransport, predlozenaKm, predlozenaPutarina } from "@/lib/transport";

type CustomerLite = { ime: string; telefon: string | null; grad: string | null; adresa: string | null };

type ItemRow = { naziv: string; tezina: string; cena: string };

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
};
const itemTotal = (r: ItemRow) => {
  const t = num(r.tezina);
  const c = num(r.cena);
  return t != null && c != null ? Number((t * c).toFixed(2)) : null;
};
const emptyRow = (): ItemRow => ({ naziv: "", tezina: "", cena: "" });

export function OrderForm({
  order,
  customers,
  products = [],
  settings = DEFAULT_SETTINGS,
}: {
  order?: Order;
  customers: CustomerLite[];
  products?: string[];
  settings?: AppSettings;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = toISODate(new Date());
  const [ime, setIme] = useState(order?.kupac_ime ?? "");
  const [telefon, setTelefon] = useState(order?.kupac_telefon ?? "");
  const [grad, setGrad] = useState(order?.grad ?? "");
  const [adresa, setAdresa] = useState(order?.adresa ?? "");
  const [slika, setSlika] = useState<string | null>(order?.slika ?? null);

  // Transport / dostava
  const [km, setKm] = useState(order?.transport_km?.toString() ?? "");
  const [transportCena, setTransportCena] = useState(order?.transport_cena?.toString() ?? "");
  // Besplatna dostava: cena = 0, polja zaključana. Pri izmeni postojeće
  // porudžbine izvodi se iz sačuvanog stanja (cena 0 uz postojeću kilometražu).
  const [besplatna, setBesplatna] = useState<boolean>(
    () => !!order && order.transport_cena === 0 && (order.transport_km ?? 0) > 0
  );
  // Postojeća porudžbina: poštuj sačuvane vrednosti (ne prepisuj automatski).
  const kmTouched = useRef<boolean>(!!order);
  const cenaTouched = useRef<boolean>(!!order);
  // Status automatskog računanja rastojanja (mapa): "" | "racuna" | "auto" | "greska"
  const [autoKm, setAutoKm] = useState<{ stanje: "racuna" | "auto" | "greska"; tekst?: string } | null>(null);
  // Procenjena povratna putarina sa mape (kad grad NIJE u tabeli rastojanja).
  const [autoPutarina, setAutoPutarina] = useState<number | null>(null);

  // Automatska povratna kilometraža (kad km nije ručno dirano):
  //  1) ako je grad u ugrađenoj tabeli → odmah, offline (tačno + putarina)
  //  2) inače → geokodiraj adresu i izračunaj vozačku rutu preko /api/rastojanje
  useEffect(() => {
    if (kmTouched.current) return;

    // 1) Poznato mesto iz tabele — trenutno, bez interneta.
    const pk = predlozenaKm(grad);
    if (pk != null) {
      setKm(String(pk));
      setAutoKm(null);
      setAutoPutarina(null); // putarina se uzima iz tabele
      return;
    }

    // 2) Nepoznato mesto — treba nam bar grad. Debounce + otkazivanje.
    if (grad.trim().length < 3) {
      setKm("");
      setAutoKm(null);
      setAutoPutarina(null);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setAutoKm({ stanje: "racuna" });
      try {
        const qs = new URLSearchParams({ grad: grad.trim(), adresa: adresa.trim() });
        const res = await fetch(`/api/rastojanje?${qs}`, { signal: ctrl.signal });
        const data = await res.json();
        if (ctrl.signal.aborted) return;
        if (res.ok && typeof data.km === "number") {
          if (kmTouched.current) return; // korisnik je u međuvremenu uneo ručno
          setKm(String(data.km));
          setAutoPutarina(typeof data.putarina === "number" ? data.putarina : 0);
          setAutoKm({ stanje: "auto", tekst: `${data.jednosmerno} km u jednom pravcu` });
        } else {
          setAutoPutarina(null);
          setAutoKm({ stanje: "greska" });
        }
      } catch {
        if (!ctrl.signal.aborted) setAutoKm({ stanje: "greska" });
      }
    }, 700);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [grad, adresa]);

  const racun = useMemo(() => {
    const kmVal = num(km);
    if (kmVal == null || kmVal <= 0) return null;
    // Putarina: tabela ima prednost; za mesta van tabele — procena sa mape.
    const tablicna = predlozenaPutarina(grad);
    const putarina = tablicna > 0 ? tablicna : (autoPutarina ?? 0);
    return obracunajTransport(kmVal, putarina, settings);
  }, [km, grad, settings, autoPutarina]);

  // Predloži cenu dostave dok je korisnik ručno ne promeni
  useEffect(() => {
    if (cenaTouched.current) return;
    setTransportCena(racun ? String(racun.predlog) : "");
  }, [racun]);

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (order?.items && order.items.length) {
      return order.items.map((i) => ({
        naziv: i.naziv,
        tezina: i.tezina_kg?.toString() ?? "",
        cena: i.cena_po_kg?.toString() ?? "",
      }));
    }
    if (order) {
      return [{ naziv: order.proizvod ?? "", tezina: order.tezina_kg?.toString() ?? "", cena: order.cena_po_kg?.toString() ?? "" }];
    }
    return [emptyRow()];
  });

  const grandTotal = useMemo(
    () => items.reduce((s, r) => s + (itemTotal(r) ?? 0), 0),
    [items]
  );

  // Jedinstveni kupci (bez duplikata po imenu) za padajuću listu / "imenik"
  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    const out: CustomerLite[] = [];
    for (const c of customers) {
      const key = c.ime.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [customers]);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyRow()]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function onNameChange(v: string) {
    setIme(v);
    const m = customers.find((c) => c.ime.toLowerCase() === v.trim().toLowerCase());
    if (m) {
      if (m.telefon && !telefon) setTelefon(m.telefon);
      if (m.grad && !grad) setGrad(m.grad);
      if (m.adresa && !adresa) setAdresa(m.adresa);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // smanji sliku na max 900px radi veličine
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setSlika(dataUrl);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cleanItems = items
      .filter((r) => r.naziv.trim())
      .map((r) => ({
        naziv: r.naziv.trim(),
        tezina_kg: num(r.tezina),
        cena_po_kg: num(r.cena),
        total: itemTotal(r),
      }));
    if (cleanItems.length === 0) {
      setError("Dodaj bar jedan proizvod (kolač).");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(cleanItems));
    fd.set("slika", slika ?? "");
    start(async () => {
      try {
        const { id } = await saveOrderAction(fd);
        router.push(`/porudzbine/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri čuvanju.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl animate-in">
      {order?.id && <input type="hidden" name="id" value={order.id} />}

      {/* Kupac */}
      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Ime kupca *</label>
            <input name="kupac_ime" required list="cust" value={ime}
              onChange={(e) => onNameChange(e.target.value)} className="input" placeholder="npr. Marija Jovanović" />
            <datalist id="cust">
              {uniqueCustomers.map((c) => (
                <option key={c.ime} value={c.ime} label={[c.telefon, c.grad].filter(Boolean).join(" · ") || undefined} />
              ))}
            </datalist>
            <p className="text-xs text-muted mt-1">Izborom poznatog kupca automatski se popune telefon, grad i adresa.</p>
          </div>
          <div>
            <label className="label">Kontakt (mobilni)</label>
            <input name="kupac_telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)}
              className="input" inputMode="tel" placeholder="06x xxx xxxx" />
          </div>
          <div>
            <label className="label">Grad za isporuku</label>
            <input name="grad" value={grad} onChange={(e) => setGrad(e.target.value)} className="input" placeholder="npr. Novi Sad" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresa isporuke</label>
            <input name="adresa" value={adresa} onChange={(e) => setAdresa(e.target.value)} className="input" placeholder="Ulica i broj" />
          </div>
        </div>
      </div>

      {/* Transport / dostava */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Truck size={15} style={{ color: "var(--accent)" }} />
          <label className="label !mb-0" style={{ fontSize: 11 }}>Transport / dostava</label>
        </div>
        <p className="text-[11px] leading-snug text-muted -mt-2">
          Polazak: Inđija, Jug Bogdana 17 · povratna vožnja (tamo-nazad). Kilometražu možeš ručno da izmeniš.
        </p>

        {/* Besplatna dostava — cena 0 RSD, polja zaključana */}
        <label className="flex items-center gap-2.5 cursor-pointer rounded-[10px] px-3 py-2.5"
          style={{
            background: besplatna ? "var(--accent-100)" : "var(--surface)",
            border: `1px solid ${besplatna ? "var(--accent-300)" : "var(--divider)"}`,
          }}>
          <input
            type="checkbox"
            name="transport_besplatna"
            checked={besplatna}
            onChange={(e) => setBesplatna(e.target.checked)}
            className="w-4 h-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-[12px] font-bold" style={{ color: besplatna ? "var(--accent-800)" : "var(--ink)" }}>
            Besplatna dostava (0 RSD)
          </span>
        </label>

        {/* Kad je dostava besplatna, km/cena polja su disabled → ne šalju se;
            zato vrednosti prosleđujemo skrivenim poljima (km ostaje zabeležen). */}
        {besplatna && (
          <>
            <input type="hidden" name="transport_km" value={km} />
            <input type="hidden" name="transport_cena" value="0" />
          </>
        )}
        {/* Procenjena putarina (mapa) uvek ide u obračun na serveru */}
        <input type="hidden" name="transport_putarina" value={racun ? String(racun.putarina) : ""} />

        <div className="grid sm:grid-cols-2 gap-3" style={besplatna ? { opacity: 0.55 } : undefined}>
          <div>
            <label className="label" style={{ fontSize: 11 }}>Kilometraža (povratno, km)</label>
            <input
              name={besplatna ? undefined : "transport_km"}
              value={km}
              disabled={besplatna}
              onChange={(e) => { kmTouched.current = true; setAutoKm(null); setKm(e.target.value); }}
              className="input disabled:cursor-not-allowed"
              style={{ fontSize: 13, minHeight: 40 }}
              inputMode="decimal"
              placeholder={predlozenaKm(grad) != null ? String(predlozenaKm(grad)) : "npr. 100"}
            />
            {!besplatna && autoKm?.stanje === "racuna" && (
              <p className="text-[11px] leading-snug text-muted mt-1 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Računam rastojanje sa mape…
              </p>
            )}
            {!besplatna && autoKm?.stanje === "auto" && (
              <p className="text-[11px] leading-snug mt-1" style={{ color: "var(--accent)" }}>
                Automatski sa mape ({autoKm.tekst}). Možeš da izmeniš.
              </p>
            )}
            {!besplatna && autoKm?.stanje === "greska" && (
              <p className="text-[11px] leading-snug text-muted mt-1">Nisam uspeo da nađem adresu — unesi km ručno.</p>
            )}
          </div>
          <div>
            <label className="label" style={{ fontSize: 11 }}>Cena dostave (RSD)</label>
            <input
              name={besplatna ? undefined : "transport_cena"}
              value={besplatna ? "0" : transportCena}
              disabled={besplatna}
              onChange={(e) => { cenaTouched.current = true; setTransportCena(e.target.value); }}
              className="input disabled:cursor-not-allowed"
              style={{ fontSize: 13, minHeight: 40 }}
              inputMode="decimal"
              placeholder="dogovorena cena"
            />
            <p className="text-[11px] leading-snug text-muted mt-1">
              {besplatna
                ? <>Dostava je besplatna. {racun && <>Preporučeno bi bilo <b>{formatRSD(racun.predlog)}</b>.</>}</>
                : racun
                  ? <>Preporučeno: <b style={{ color: "var(--accent)" }}>{formatRSD(racun.predlog)}</b> — možeš da izmeniš.</>
                  : "Unesi km da bi dobila predlog."}
            </p>
          </div>
        </div>

        {racun && (
          <div className="grid grid-cols-2 gap-2 text-center" style={besplatna ? { opacity: 0.55 } : undefined}>
            <TransportCell label={`Gorivo (${racun.litara.toLocaleString("sr-RS", { maximumFractionDigits: 1 })} l)`} value={racun.gorivo} />
            <TransportCell label="Putarina" value={racun.putarina} />
          </div>
        )}
        {racun && (
          <div className="flex items-center justify-between rounded-[10px] px-3.5 py-2"
            style={{ background: "var(--surface)", border: "1px solid var(--divider)", opacity: besplatna ? 0.55 : 1 }}>
            <span className="kicker" style={{ fontSize: 10 }}>Realan trošak prevoza</span>
            <span className="text-[13px] font-extrabold tabular-nums">{formatRSD(racun.ukupno)}</span>
          </div>
        )}
      </div>

      {/* Datumi + status */}
      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Datum porudžbine *</label>
          <input type="date" name="datum_porudzbine" required defaultValue={order?.datum_porudzbine ?? today} className="input" />
        </div>
        <div>
          <label className="label">Datum isporuke *</label>
          <input type="date" name="datum_isporuke" required defaultValue={order?.datum_isporuke ?? today} className="input" />
        </div>
        <div>
          <label className="label">Vreme isporuke</label>
          <input type="time" name="vreme_isporuke" defaultValue={order?.vreme_isporuke ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={order?.status ?? "primljena"} className="select">
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Porudžbina — više vrsta kolača */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <label className="label !mb-0">Proizvodi (kolači / torte) *</label>
          <span className="text-xs text-muted">{items.length} {items.length === 1 ? "stavka" : "stavke"}</span>
        </div>

        {/* Autocomplete iz ranije pravljenih proizvoda (najčešći prvi) */}
        <datalist id="proizvodi">
          {products.map((p) => <option key={p} value={p} />)}
        </datalist>

        <div className="space-y-3">
          {items.map((row, idx) => {
            const rowTotal = itemTotal(row);
            return (
              <div key={idx} className="rounded-[12px] p-3 space-y-3"
                style={{ border: "1px solid var(--divider)", background: "var(--surface)" }}>
                <div className="flex items-center gap-2">
                  <span className="grid place-items-center w-6 h-6 rounded-full text-xs font-extrabold shrink-0"
                    style={{ background: "var(--accent-100)", color: "var(--accent-800)" }}>{idx + 1}</span>
                  <input
                    value={row.naziv}
                    onChange={(e) => updateItem(idx, { naziv: e.target.value })}
                    list="proizvodi"
                    className="input flex-1"
                    placeholder="npr. Torta Ferrero, Vanil kifle…"
                  />
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                    className="btn btn-icon btn-ghost shrink-0 disabled:opacity-30" aria-label="Ukloni proizvod">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="label">Težina (kg)</label>
                    <input value={row.tezina} onChange={(e) => updateItem(idx, { tezina: e.target.value })}
                      className="input" inputMode="decimal" placeholder="2" />
                  </div>
                  <div>
                    <label className="label">Cena / kg</label>
                    <input value={row.cena} onChange={(e) => updateItem(idx, { cena: e.target.value })}
                      className="input" inputMode="decimal" placeholder="2800" />
                  </div>
                  <div className="min-w-0">
                    <label className="label">Cena stavke</label>
                    <div className="rounded-[10px] px-2.5 py-2.5 font-extrabold text-[13px] leading-tight tabular-nums"
                      style={{ background: "var(--accent-100)", border: "1px solid var(--accent-300)", color: "var(--accent-800)" }}>
                      {formatRSD(rowTotal ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addItem} className="btn btn-secondary btn-block">
          <Plus size={18} /> Dodaj još jedan proizvod
        </button>

        <div className="flex items-center justify-between rounded-[12px] px-4 py-3"
          style={{ background: "var(--accent-100)", border: "1px solid var(--accent-300)" }}>
          <span className="kicker" style={{ color: "var(--accent-800)" }}>Ukupno cela porudžbina</span>
          <span className="text-xl font-extrabold" style={{ color: "var(--accent-800)" }}>{formatRSD(grandTotal)}</span>
        </div>

        <div>
          <label className="label">Opis / dodatak</label>
          <textarea name="opis" defaultValue={order?.opis ?? ""} className="textarea" rows={2}
            placeholder="Ukusi, dekoracija, natpis…" />
        </div>
      </div>

      {/* Posebna želja + slika */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Posebna želja / napomena (slika, toper, ukras…)</label>
          <textarea name="napomena" defaultValue={order?.napomena ?? ""} className="textarea" rows={2}
            placeholder="npr. jestivi toper sa slikom, ruže od fondana, bez oraha…" />
        </div>
        <div>
          <label className="label">Slika primera</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {slika ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slika} alt="Primer" className="max-h-48 rounded-[10px] grayscale border border-[var(--divider)]" />
              <button type="button" onClick={() => setSlika(null)}
                className="absolute -top-2 -right-2 grid place-items-center w-7 h-7 rounded-full btn-primary">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary">
              <ImagePlus size={18} /> Dodaj sliku
            </button>
          )}
        </div>
      </div>

      {error && <div className="card p-3 text-sm font-bold" style={{ color: "var(--accent)" }}>{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {order?.id ? "Sačuvaj izmene" : "Sačuvaj porudžbinu"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">Otkaži</button>
      </div>
    </form>
  );
}

function TransportCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] py-2 px-1" style={{ background: "var(--surface)", border: "1px solid var(--divider)" }}>
      <div className="kicker" style={{ fontSize: 9 }}>{label}</div>
      <div className="mt-0.5 font-bold tabular-nums" style={{ fontSize: 13 }}>{formatRSD(value)}</div>
    </div>
  );
}
