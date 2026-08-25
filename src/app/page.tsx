import Link from "next/link";
import { Plus } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders } from "@/lib/data";
import { OrderCard } from "@/components/OrderCard";
import { SetupNotice } from "@/components/SetupNotice";
import { Kpi, SectionLabel } from "@/components/ui";
import { danaDo, toISODate, formatRSD, MESECI } from "@/lib/format";
import { proizvodnaCena, zarada } from "@/lib/costs";

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

  // Finansije tekućeg meseca (po datumu isporuke)
  const now = new Date();
  const mesecISO = toISODate(now).slice(0, 7);
  const mesecOrders = orders.filter((o) => o.datum_isporuke.slice(0, 7) === mesecISO);
  const prometMeseca = mesecOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const troskoviMeseca = mesecOrders.reduce((s, o) => s + (proizvodnaCena(o.total) ?? 0), 0);
  const zaradaMeseca = mesecOrders.reduce((s, o) => s + (zarada(o.total) ?? 0), 0);
  const imeMeseca = MESECI[now.getMonth()];

  // Za danas: današnje + zakasnele (hitno)
  const zaPrikaz = [...kasne, ...zaDanas];

  // Naredne porudžbine do kraja tekućeg meseca (od sutra), po datumu rastuće
  const naredneDoKraja = aktivne
    .filter((o) => danaDo(o.datum_isporuke) > 0 && o.datum_isporuke.slice(0, 7) === mesecISO)
    .sort((a, b) => a.datum_isporuke.localeCompare(b.datum_isporuke));

  return (
    <div className="space-y-6 animate-in">
      <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3">
        <Kpi label="Danas za isporuku" value={String(zaDanas.length)} />
        <Kpi label="U radu" value={String(uRadu)} />
        <Kpi label="Ova nedelja" value={String(ovaNedelja)} />
        <Kpi label="Porudžbina (mesec)" value={String(mesecOrders.length)} />
      </div>

      {/* Finansije tekućeg meseca */}
      <div>
        <SectionLabel>Ovaj mesec · {imeMeseca}</SectionLabel>
        <div className="card p-4 grid grid-cols-3 gap-2 text-center">
          <MonthStat label="Promet" value={prometMeseca} strong />
          <MonthStat label="Troškovi" value={troskoviMeseca} />
          <MonthStat label="Zarada" value={zaradaMeseca} accent />
        </div>
      </div>

      {/* Brzi pregled za danas */}
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

      {/* Naredne porudžbine do kraja meseca */}
      <div>
        <SectionLabel>Naredne do kraja meseca</SectionLabel>
        {naredneDoKraja.length === 0 ? (
          <div className="card p-6 text-center text-muted">
            Nema više zakazanih porudžbina ovog meseca.
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-3">
            {naredneDoKraja.map((o) => (
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

function MonthStat({ label, value, strong, accent }: {
  label: string; value: number; strong?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-[10px] py-2.5 px-1" style={{ background: "var(--bg)" }}>
      <div className="kicker" style={{ fontSize: 10 }}>{label}</div>
      <div
        className={`mt-0.5 tabular-nums ${strong || accent ? "font-extrabold" : "font-bold"}`}
        style={{ fontSize: 15, color: accent ? "var(--accent)" : "var(--ink)" }}
      >
        {formatRSD(value)}
      </div>
    </div>
  );
}
