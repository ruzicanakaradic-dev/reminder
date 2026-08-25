import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders, getCustomers } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, Kpi } from "@/components/ui";
import { formatRSD, MESECI } from "@/lib/format";
import { proizvodnaCena, zarada } from "@/lib/costs";

export const dynamic = "force-dynamic";

type Row = { label: string; value: number; sub?: string };
type MonthFin = { label: string; broj: number; promet: number; trosak: number; zarada: number; tekuci: boolean };

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

  // Pregled po mesecu (tekući + 3 unapred): promet, proizvodna cena i zarada za
  // porudžbine već zakazane za budućnost.
  const mesecniFin: MonthFin[] = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const meseca = orders.filter((o) => o.datum_isporuke.slice(0, 7) === key);
    mesecniFin.push({
      label: `${MESECI[d.getMonth()]} ${d.getFullYear()}`,
      broj: meseca.length,
      promet: meseca.reduce((s, o) => s + (o.total ?? 0), 0),
      trosak: meseca.reduce((s, o) => s + (proizvodnaCena(o.total) ?? 0), 0),
      zarada: meseca.reduce((s, o) => s + (zarada(o.total) ?? 0), 0),
      tekuci: i === 0,
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

      <MonthFinanceList title="Po mesecu — promet, trošak i zarada" rows={mesecniFin} />
      <BarList title="Promet po mesecu (poslednjih 6)" rows={mesecni} color="var(--accent)" money />
      <BarList title="Najbolji kupci" rows={kupci} color="var(--ink)" money />
      <BarList title="Po gradu / mestu" rows={gradovi} color="var(--neutral-600)" money />
      <BarList title="Najprodavaniji proizvod" rows={proizvodi} color="var(--gold)" suffix=" kom" />
    </div>
  );
}

function MonthFinanceList({ title, rows }: { title: string; rows: MonthFin[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-lg mb-4">{title}</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-[14px] p-3.5"
            style={{
              background: r.tekuci ? "var(--accent-100)" : "var(--surface)",
              border: `1px solid ${r.tekuci ? "var(--accent-300)" : "var(--divider)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-extrabold capitalize">{r.label}</span>
              <span className="text-[11px] text-muted">
                {r.tekuci ? "tekući · " : ""}{r.broj} porudžbina
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <FinCell label="Promet" value={r.promet} strong />
              <FinCell label="Proizvodna" value={r.trosak} />
              <FinCell label="Zarada" value={r.zarada} accent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinCell({ label, value, strong, accent }: {
  label: string; value: number; strong?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-[10px] py-2 px-1" style={{ background: "var(--bg)" }}>
      <div className="kicker" style={{ fontSize: 10 }}>{label}</div>
      <div
        className={`mt-0.5 tabular-nums ${strong || accent ? "font-extrabold" : "font-bold"}`}
        style={{ fontSize: 14, color: accent ? "var(--accent)" : "var(--ink)" }}
      >
        {formatRSD(value)}
      </div>
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
