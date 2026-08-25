import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders, getCustomers } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, Kpi } from "@/components/ui";
import { formatRSD, MESECI } from "@/lib/format";
import { proizvodnaCena, zarada } from "@/lib/costs";

export const dynamic = "force-dynamic";

type Row = { label: string; value: number; sub?: string };

export default async function StatistikaPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);

  if (orders.length === 0) {
    return (
      <EmptyState emoji="📊" title="Nema podataka"
        hint="Statistika će se popuniti čim dodaš porudžbine."
        cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }} />
    );
  }

  const promet = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const prosek = Math.round(promet / orders.length);
  const trosak = orders.reduce((s, o) => s + (proizvodnaCena(o.total) ?? 0), 0);
  const zaradaUk = orders.reduce((s, o) => s + (zarada(o.total) ?? 0), 0);

  // Promet po mesecu (poslednjih 6)
  const now = new Date();
  const mesecni: Row[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const v = orders.filter((o) => o.datum_isporuke.slice(0, 7) === key).reduce((s, o) => s + (o.total ?? 0), 0);
    mesecni.push({ label: MESECI[d.getMonth()].slice(0, 3), value: v });
  }

  // Rezervisano — naredni meseci (tekući + 3 unapred): porudžbine već zakazane za budućnost
  const naredni: Row[] = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const meseca = orders.filter((o) => o.datum_isporuke.slice(0, 7) === key);
    const v = meseca.reduce((s, o) => s + (o.total ?? 0), 0);
    naredni.push({
      label: `${MESECI[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
      value: v,
      sub: `${meseca.length} porudžbina`,
    });
  }

  const grp = (keyFn: (o: (typeof orders)[number]) => string, valFn: (o: (typeof orders)[number]) => number) => {
    const m = new Map<string, { v: number; n: number }>();
    for (const o of orders) {
      const k = (keyFn(o) || "—").trim() || "—";
      const cur = m.get(k) ?? { v: 0, n: 0 };
      cur.v += valFn(o);
      cur.n += 1;
      m.set(k, cur);
    }
    return [...m.entries()].map(([label, x]) => ({ label, value: x.v, sub: `${x.n} porudžbina` }));
  };

  const kupci = grp((o) => o.kupac_ime, (o) => o.total ?? 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const gradovi = grp((o) => o.grad ?? "—", (o) => o.total ?? 0).sort((a, b) => b.value - a.value).slice(0, 6);
  // Najprodavaniji proizvod — grupiši po GLAVNOM proizvodu (prva reč naziva).
  // Npr. „strudla mak", „strudla orasi" i „strudla" spadaju pod „strudla";
  // brojimo svaku stavku (kolač), a ne porudžbinu.
  const glavniProizvod = (naziv: string) => naziv.trim().split(/\s+/)[0] ?? "";
  const prodMap = new Map<string, Row>();
  for (const o of orders) {
    for (const deo of (o.proizvod ?? "").split(",")) {
      const naziv = deo.trim();
      if (!naziv) continue;
      const baza = glavniProizvod(naziv);
      const kljuc = baza.toLowerCase();
      const cur = prodMap.get(kljuc) ?? { label: baza, value: 0 };
      cur.value += 1;
      prodMap.set(kljuc, cur);
    }
  }
  const proizvodi = [...prodMap.values()].sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div className="space-y-6 animate-in">
      <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3">
        <Kpi label="Ukupan promet" value={formatRSD(promet)} />
        <Kpi label="Broj porudžbina" value={String(orders.length)} />
        <Kpi label="Broj kupaca" value={String(customers.length)} />
        <Kpi label="Prosečna porudžbina" value={formatRSD(prosek)} />
        <Kpi label="Proizvodni trošak (~30%)" value={formatRSD(trosak)} />
        <Kpi label="Ukupna zarada" value={formatRSD(zaradaUk)} />
      </div>

      <BarList title="Rezervisano — naredni meseci" rows={naredni} color="var(--accent)" money />
      <BarList title="Promet po mesecu" rows={mesecni} color="var(--accent)" money />
      <BarList title="Najbolji kupci" rows={kupci} color="var(--ink)" money />
      <BarList title="Po gradu / mestu" rows={gradovi} color="var(--neutral-600)" money />
      <BarList title="Najprodavaniji proizvod" rows={proizvodi} color="var(--gold)" suffix=" kom" />
    </div>
  );
}

function BarList({ title, rows, color, money, suffix }: {
  title: string; rows: Row[]; color: string; money?: boolean; suffix?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card p-5">
      <h2 className="text-lg mb-4">{title}</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold truncate pr-2">{r.label}</span>
              <span className="text-muted shrink-0">{money ? formatRSD(r.value) : `${r.value}${suffix ?? ""}`}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round((r.value / max) * 100)}%`, background: color }} />
            </div>
            {r.sub && <div className="text-[11px] text-muted mt-0.5">{r.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
