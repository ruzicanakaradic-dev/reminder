import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomer, getOrders } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { OrderCard } from "@/components/OrderCard";
import { Kpi, SectionLabel } from "@/components/ui";
import { PhoneActions } from "@/components/PhoneActions";
import { customerCode } from "@/lib/types";
import { formatRSD, formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KupacDetalj({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const kupac = await getCustomer(id);
  if (!kupac) notFound();

  const orders = await getOrders({ customerId: id });
  const sorted = [...orders].sort((a, b) => b.datum_isporuke.localeCompare(a.datum_isporuke));
  const prihod = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const kg = orders.reduce((s, o) => s + (o.tezina_kg ?? 0), 0);

  return (
    <div className="space-y-5 animate-in max-w-2xl">
      <Link href="/kupci" className="btn btn-ghost text-sm !px-2">
        <ArrowLeft size={16} /> Svi kupci
      </Link>

      <div className="card p-5" style={{ borderWidth: 2 }}>
        <div className="kicker" style={{ color: "var(--accent)" }}>
          {customerCode(kupac.redni_broj)} · redni br. {kupac.redni_broj}
        </div>
        <h2 className="text-2xl mt-1">{kupac.ime}</h2>
        <div className="text-sm text-muted flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {kupac.telefon && <PhoneActions telefon={kupac.telefon} variant="inline" />}
          {(kupac.grad || kupac.adresa) && (
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {[kupac.adresa, kupac.grad].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Kpi label="Porudžbina" value={String(orders.length)} />
          <Kpi label="Potrošeno" value={formatRSD(prihod)} />
          <Kpi label="Ukupno kg" value={formatKg(kg)} />
        </div>
      </div>

      <div>
        <SectionLabel>Istorija porudžbina</SectionLabel>
        <div className="grid grid-cols-1 gap-3">
          {sorted.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      </div>
    </div>
  );
}
