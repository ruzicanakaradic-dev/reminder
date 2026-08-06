"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ImagePlus, X } from "lucide-react";
import { saveOrderAction } from "@/app/actions";
import { STATUS_LABEL, STATUS_ORDER, type Order, type Status } from "@/lib/types";
import { formatRSD, toISODate } from "@/lib/format";

type CustomerLite = { ime: string; telefon: string | null; grad: string | null; adresa: string | null };

export function OrderForm({ order, customers }: { order?: Order; customers: CustomerLite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = toISODate(new Date());
  const [ime, setIme] = useState(order?.kupac_ime ?? "");
  const [telefon, setTelefon] = useState(order?.kupac_telefon ?? "");
  const [grad, setGrad] = useState(order?.grad ?? "");
  const [adresa, setAdresa] = useState(order?.adresa ?? "");
  const [tezina, setTezina] = useState<string>(order?.tezina_kg?.toString() ?? "");
  const [cena, setCena] = useState<string>(order?.cena_po_kg?.toString() ?? "");
  const [slika, setSlika] = useState<string | null>(order?.slika ?? null);

  const autoTotal = useMemo(() => {
    const t = parseFloat(tezina.replace(",", "."));
    const c = parseFloat(cena.replace(",", "."));
    return !isNaN(t) && !isNaN(c) ? Number((t * c).toFixed(2)) : null;
  }, [tezina, cena]);

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
    const fd = new FormData(e.currentTarget);
    fd.set("total", autoTotal != null ? String(autoTotal) : "");
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
            <datalist id="cust">{customers.map((c) => <option key={c.ime} value={c.ime} />)}</datalist>
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

      {/* Porudžbina */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Šta je porudžbina *</label>
          <input name="proizvod" required defaultValue={order?.proizvod ?? ""} className="input"
            placeholder="npr. Torta Ferrero 2kg, 100 kom sitnih kolača…" />
        </div>
        <div>
          <label className="label">Opis / dodatak</label>
          <textarea name="opis" defaultValue={order?.opis ?? ""} className="textarea" rows={2}
            placeholder="Ukusi, dekoracija, natpis…" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Težina (kg)</label>
            <input name="tezina_kg" value={tezina} onChange={(e) => setTezina(e.target.value)} className="input" inputMode="decimal" placeholder="2" />
          </div>
          <div>
            <label className="label">Cena po kg (RSD)</label>
            <input name="cena_po_kg" value={cena} onChange={(e) => setCena(e.target.value)} className="input" inputMode="decimal" placeholder="2800" />
          </div>
          <div>
            <label className="label">Ukupno</label>
            <div className="rounded-[10px] px-3 py-2.5 font-extrabold text-lg"
              style={{ background: "var(--accent-100)", border: "1px solid var(--accent-300)", color: "var(--accent-800)" }}>
              {formatRSD(autoTotal ?? 0)}
            </div>
          </div>
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
