import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomer, getOrders } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { OrderCard } from "@/components/OrderCard";
import { Stat } from "@/components/ui";
import { formatRSD, formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KupacDetalj({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const kupac = await getCustomer(id);
  if (!kupac) notFound();

  const orders = await getOrders({ customerId: id });
  // najnovije prvo
  const sorted = [...orders].sort((a, b) => b.datum_isporuke.localeCompare(a.datum_isporuke));

  const prihod = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const kg = orders.reduce((s, o) => s + (o.tezina_kg ?? 0), 0);

  // omiljeni proizvod
  const brojPoProizvodu = new Map<string, number>();
  orders.forEach((o) => brojPoProizvodu.set(o.proizvod, (brojPoProizvodu.get(o.proizvod) ?? 0) + 1));
  const omiljeni = [...brojPoProizvodu.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-5">
      <Link href="/kupci" className="btn btn-ghost text-sm">
        <ArrowLeft size={16} /> Kupci
      </Link>

      <div className="card p-6 flex items-center gap-4">
        <span className="grid place-items-center w-16 h-16 rounded-full bg-rose-100 text-rose-600 text-2xl font-bold shrink-0">
          {kupac.ime.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-rose-400">Kupac #{kupac.redni_broj}</div>
          <h1 className="display text-2xl font-semibold text-ink truncate">{kupac.ime}</h1>
          {kupac.telefon && (
            <a href={`tel:${kupac.telefon}`} className="text-sm text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
              <Phone size={14} /> {kupac.telefon}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Porudžbina" value={String(orders.length)} />
        <Stat label="Potrošeno" value={formatRSD(prihod)} accent="var(--rose-600)" />
        <Stat label="Ukupno kg" value={formatKg(kg)} />
      </div>

      {omiljeni && (
        <div className="card p-4 text-sm">
          <span className="text-muted">Najčešće naručuje: </span>
          <span className="font-semibold text-ink">{omiljeni}</span>
        </div>
      )}

      <div>
        <h2 className="display text-lg font-semibold text-ink mb-3">Istorija porudžbina</h2>
        <div className="space-y-3">
          {sorted.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      </div>
    </div>
  );
}
