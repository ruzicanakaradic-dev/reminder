"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveOrderAction } from "@/app/actions";
import { STATUS_LABEL, STATUS_ORDER, type Order, type Status } from "@/lib/types";
import { formatRSD, toISODate } from "@/lib/format";

type CustomerLite = { ime: string; telefon: string | null };

export function OrderForm({
  order,
  customers,
}: {
  order?: Order;
  customers: CustomerLite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = toISODate(new Date());
  const [ime, setIme] = useState(order?.kupac_ime ?? "");
  const [telefon, setTelefon] = useState(order?.kupac_telefon ?? "");
  const [tezina, setTezina] = useState<string>(order?.tezina_kg?.toString() ?? "");
  const [cena, setCena] = useState<string>(order?.cena_po_kg?.toString() ?? "");
  const [totalManual, setTotalManual] = useState<string>(order?.total?.toString() ?? "");
  const [rucnoTotal, setRucnoTotal] = useState(false);

  const autoTotal = useMemo(() => {
    const t = parseFloat(tezina.replace(",", "."));
    const c = parseFloat(cena.replace(",", "."));
    if (!isNaN(t) && !isNaN(c)) return Number((t * c).toFixed(2));
    return null;
  }, [tezina, cena]);

  const prikazaniTotal = rucnoTotal
    ? parseFloat(totalManual.replace(",", ".")) || 0
    : autoTotal ?? 0;

  function onNameChange(v: string) {
    setIme(v);
    const match = customers.find((c) => c.ime.toLowerCase() === v.trim().toLowerCase());
    if (match && match.telefon && !telefon) setTelefon(match.telefon);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("total", rucnoTotal ? totalManual : autoTotal != null ? String(autoTotal) : "");
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
    <form onSubmit={onSubmit} className="space-y-5">
      {order?.id && <input type="hidden" name="id" value={order.id} />}

      <div className="card p-5 space-y-4">
        <h2 className="display text-lg font-semibold text-ink">Kupac</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ime kupca *</label>
            <input
              name="kupac_ime"
              required
              list="customer-list"
              value={ime}
              onChange={(e) => onNameChange(e.target.value)}
              className="input"
              placeholder="npr. Marija Jovanović"
            />
            <datalist id="customer-list">
              {customers.map((c) => (
                <option key={c.ime} value={c.ime} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Kontakt (mobilni)</label>
            <input
              name="kupac_telefon"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="input"
              inputMode="tel"
              placeholder="06x xxx xxxx"
            />
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="display text-lg font-semibold text-ink">Porudžbina</h2>
        <div>
          <label className="label">Šta je porudžbina *</label>
          <input
            name="proizvod"
            required
            defaultValue={order?.proizvod ?? ""}
            className="input"
            placeholder="npr. Torta Ferrero 2kg, 100 kom sitnih kolača…"
          />
        </div>
        <div>
          <label className="label">Opis / dodatak (opciono)</label>
          <textarea
            name="opis"
            defaultValue={order?.opis ?? ""}
            className="textarea"
            rows={3}
            placeholder="Ukusi, dekoracija, natpis, alergije, posebne želje…"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Težina (kg)</label>
            <input
              name="tezina_kg"
              value={tezina}
              onChange={(e) => setTezina(e.target.value)}
              className="input"
              inputMode="decimal"
              placeholder="2"
            />
          </div>
          <div>
            <label className="label">Cena po kg (RSD)</label>
            <input
              name="cena_po_kg"
              value={cena}
              onChange={(e) => setCena(e.target.value)}
              className="input"
              inputMode="decimal"
              placeholder="2500"
            />
          </div>
          <div>
            <label className="label">Ukupno (total)</label>
            <input
              value={rucnoTotal ? totalManual : autoTotal != null ? String(autoTotal) : ""}
              onChange={(e) => {
                setRucnoTotal(true);
                setTotalManual(e.target.value);
              }}
              className="input"
              inputMode="decimal"
              placeholder="auto"
            />
            <p className="text-xs text-muted mt-1">
              {rucnoTotal ? "Ručno unet iznos." : "Automatski = težina × cena."}{" "}
              <span className="font-semibold text-rose-600">{formatRSD(prikazaniTotal)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="display text-lg font-semibold text-ink">Datumi i isporuka</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Datum porudžbine *</label>
            <input
              type="date"
              name="datum_porudzbine"
              required
              defaultValue={order?.datum_porudzbine ?? today}
              className="input"
            />
          </div>
          <div>
            <label className="label">Datum isporuke *</label>
            <input
              type="date"
              name="datum_isporuke"
              required
              defaultValue={order?.datum_isporuke ?? today}
              className="input"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Adresa isporuke</label>
            <input
              name="adresa"
              defaultValue={order?.adresa ?? ""}
              className="input"
              placeholder="Ulica i broj"
            />
          </div>
          <div>
            <label className="label">Grad za isporuku</label>
            <input
              name="grad"
              defaultValue={order?.grad ?? ""}
              className="input"
              placeholder="npr. Novi Sad"
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <label className="label">Status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <StatusRadio key={s} value={s} defaultChecked={(order?.status ?? "u_radu") === s} />
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-3 text-sm text-rose-700 bg-rose-50 border-rose-200">{error}</div>
      )}

      <div className="flex gap-3 sticky bottom-20 sm:static">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {order?.id ? "Sačuvaj izmene" : "Sačuvaj porudžbinu"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-ghost">
          Otkaži
        </button>
      </div>
    </form>
  );
}

function StatusRadio({ value, defaultChecked }: { value: Status; defaultChecked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="status" value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        className={`chip status-${value} peer-checked:ring-2 peer-checked:ring-offset-1 transition-all`}
        style={{ outline: "none" }}
      >
        <span className="chip-dot" />
        {STATUS_LABEL[value]}
      </span>
    </label>
  );
}
