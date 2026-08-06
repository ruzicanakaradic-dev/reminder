"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ImagePlus, X, Plus, Trash2 } from "lucide-react";
import { saveOrderAction } from "@/app/actions";
import { STATUS_LABEL, STATUS_ORDER, type Order, type Status } from "@/lib/types";
import { formatRSD, toISODate } from "@/lib/format";

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
  const [slika, setSlika] = useState<string | null>(order?.slika ?? null);

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

      {/* Porudžbina — više vrsta kolača */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <label className="label !mb-0">Proizvodi (kolači / torte) *</label>
          <span className="text-xs text-muted">{items.length} {items.length === 1 ? "stavka" : "stavke"}</span>
        </div>

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
