"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateCustomerAction } from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";
import type { Customer } from "@/lib/types";

export function CustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const res = await updateCustomerAction(fd);
        if (!res.ok) {
          setError(res.greska);
          return;
        }
        router.push(`/kupci/${customer.id}`);
        router.refresh();
      } catch (err) {
        setError(razumljivaPoruka(err));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl animate-in">
      <input type="hidden" name="id" value={customer.id} />

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Ime kupca *</label>
            <input name="ime" required defaultValue={customer.ime} className="input" placeholder="npr. Marija Jovanović" />
          </div>
          <div>
            <label className="label">Kontakt (mobilni)</label>
            <input name="telefon" defaultValue={customer.telefon ?? ""} className="input" inputMode="tel" placeholder="06x xxx xxxx" />
          </div>
          <div>
            <label className="label">Grad za isporuku</label>
            <input name="grad" defaultValue={customer.grad ?? ""} className="input" placeholder="npr. Novi Sad" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresa isporuke</label>
            <input name="adresa" defaultValue={customer.adresa ?? ""} className="input" placeholder="Ulica i broj" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Napomena</label>
            <textarea name="napomena" defaultValue={customer.napomena ?? ""} className="textarea" rows={2}
              placeholder="npr. stalni kupac, voli manje slatko…" />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none rounded-[12px] p-3"
          style={{ border: "1px solid var(--divider)", background: "var(--surface)" }}>
          <input type="checkbox" name="primeni_adresu_na_porudzbine" defaultChecked
            className="mt-0.5 w-5 h-5 shrink-0" style={{ accentColor: "var(--brand)" }} />
          <span className="text-sm">
            <span className="font-bold">Ispravi adresu i na ranijim porudžbinama</span>
            <span className="block text-muted text-xs mt-0.5">
              Uključeno: ispravljeni grad i adresa prelaze na sve porudžbine ovog kupca (dostava se preračuna ako se grad promeni).
              Isključi ako su neke porudžbine namerno imale drugu adresu.
            </span>
          </span>
        </label>

        <p className="text-xs text-muted">
          Ispravka imena i telefona uvek se ažurira i na ranijim porudžbinama.
        </p>
      </div>

      {error && <div className="card p-3 text-sm font-bold" style={{ color: "var(--brand)" }}>{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Sačuvaj izmene
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">Otkaži</button>
      </div>
    </form>
  );
}
