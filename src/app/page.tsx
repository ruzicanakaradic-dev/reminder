import Link from "next/link";
import { Plus } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders } from "@/lib/data";
import { OrderCard } from "@/components/OrderCard";
import { SetupNotice } from "@/components/SetupNotice";
import { Kpi, SectionLabel } from "@/components/ui";
import { danaDo, toISODate, formatRSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DanasPage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const orders = await getOrders();
  const aktivne = orders.filter((o) => o.status !== "isporuceno");

  const zaDanas = aktivne.filter((o) => danaDo(o.datum_isporuke) === 0);
  const kasne = aktivne.filter((o) => danaDo(o.datum_isporuke) < 0);
  const uRadu = orders.filter((o) => o.status === "u_radu").length;
  const ovaNedelja = aktivne.filter((o) => {
    const d = danaDo(o.datum_isporuke);
    return d >= 0 && d <= 7;
  }).length;

  const now = new Date();
  const mesecISO = toISODate(now).slice(0, 7);
  const prometMeseca = orders
    .filter((o) => o.datum_isporuke.slice(0, 7) === mesecISO)
    .reduce((s, o) => s + (o.total ?? 0), 0);

  // Za danas: današnje + zakasnele (hitno)
  const zaPrikaz = [...kasne, ...zaDanas];

  return (
    <div className="space-y-6 animate-in">
      <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3">
        <Kpi label="Danas za isporuku" value={String(zaDanas.length)} />
        <Kpi label="U radu" value={String(uRadu)} />
        <Kpi label="Ova nedelja" value={String(ovaNedelja)} />
        <Kpi label="Promet (mesec)" value={formatRSD(prometMeseca)} />
      </div>

      <div>
        <SectionLabel>Za danas {kasne.length > 0 ? "i u kašnjenju" : ""}</SectionLabel>
        {zaPrikaz.length === 0 ? (
          <div className="card p-6 text-center text-muted">
            🎉 Nema porudžbina za isporuku danas.
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-3">
            {zaPrikaz.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>

      {aktivne.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">🧁</div>
          <div className="text-xl font-extrabold">Sve je pod kontrolom</div>
          <p className="text-muted text-sm mt-1">Trenutno nema aktivnih porudžbina.</p>
          <Link href="/porudzbine/nova" className="btn btn-primary mt-4 inline-flex">
            <Plus size={18} /> Dodaj porudžbinu
          </Link>
        </div>
      )}
    </div>
  );
}
