import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders, getCustomers } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, Kpi } from "@/components/ui";
import { formatRSD, formatKg, MESECI } from "@/lib/format";

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

  // Promet po mesecu (poslednjih 6)
  const now = new Date();
  const mesecni: Row[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const v = orders.filter((o) => o.datum_isporuke.slice(0, 7) === key).reduce((s, o) => s + (o.total ?? 0), 0);
    mesecni.push({ label: MESECI[d.getMonth()].slice(0, 3), value: v });
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
  const proizvodi = grp((o) => o.proizvod, () => 1).sort((a, b) => b.value - a.value).slice(0, 6)
    .map((r) => ({ ...r, sub: undefined }));

  return (
    <div className="space-y-6 animate-in">
      <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3">
        <Kpi label="Ukupan promet" value={formatRSD(promet)} />
        <Kpi label="Broj porudžbina" value={String(orders.length)} />
        <Kpi label="Broj kupaca" value={String(customers.length)} />
        <Kpi label="Prosečna porudžbina" value={formatRSD(prosek)} />
      </div>

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
