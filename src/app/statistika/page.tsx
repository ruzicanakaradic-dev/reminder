import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders, getCustomers } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { MonthSelect } from "@/components/MonthSelect";
import { PeriodSelect } from "@/components/PeriodSelect";
import { EmptyState, Kpi } from "@/components/ui";
import { formatRSD, formatNum, MESECI } from "@/lib/format";
import { trosak, ukupnaCena, zarada } from "@/lib/costs";

export const dynamic = "force-dynamic";

type Row = { label: string; value: number; sub?: string };
type MonthFin = { label: string; broj: number; promet: number; trosak: number; zarada: number; tekuci: boolean };

const PERIODI = ["6", "12", "24", "36"];

export default async function StatistikaPage({
  searchParams,
}: {
  searchParams: Promise<{ mesec?: string; period?: string }>;
}) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const [orders, customers, sp] = await Promise.all([getOrders(), getCustomers(), searchParams]);

  if (orders.length === 0) {
    return (
      <EmptyState emoji="📊" title="Nema podataka"
        hint="Statistika će se popuniti čim dodaš porudžbine."
        cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }} />
    );
  }

  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // ── Period prodaje: poslednjih 6/12/24/36 meseci (ili sve) ─────────
  const period = sp.period && PERIODI.includes(sp.period) ? sp.period : "sve";
  const periodN = period === "sve" ? null : Number(period);
  let windowKeys: Set<string> | null = null;
  if (periodN) {
    windowKeys = new Set();
    for (let i = 0; i < periodN; i++) windowKeys.add(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  const periodOrders = windowKeys
    ? orders.filter((o) => windowKeys!.has(o.datum_isporuke.slice(0, 7)))
    : orders;
  const periodLabel = periodN ? `poslednjih ${periodN} meseci` : "svo vreme";

  const promet = periodOrders.reduce((s, o) => s + ukupnaCena(o), 0);
  const prosek = periodOrders.length ? Math.round(promet / periodOrders.length) : 0;
  const trosakUk = periodOrders.reduce((s, o) => s + trosak(o), 0);
  const zaradaUk = periodOrders.reduce((s, o) => s + zarada(o), 0);
  // „Broj kupaca" za period = koliko različitih kupaca je naručilo u tom prozoru;
  // za „sve" zadrži ukupan broj upisanih kupaca.
  const brojKupaca = periodN
    ? new Set(periodOrders.map((o) => o.customer_id ?? o.kupac_ime)).size
    : customers.length;

  // Promet po mesecu — prati izabrani period (podrazumevano poslednjih 6).
  const chartN = periodN ?? 6;
  const prometPoMesecu = new Map<string, number>();
  for (const o of orders) {
    const k = o.datum_isporuke.slice(0, 7);
    prometPoMesecu.set(k, (prometPoMesecu.get(k) ?? 0) + ukupnaCena(o));
  }
  const mesecni: Row[] = [];
  for (let i = chartN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = chartN > 12
      ? `${MESECI[d.getMonth()].slice(0, 3)} '${String(d.getFullYear()).slice(2)}`
      : MESECI[d.getMonth()].slice(0, 3);
    mesecni.push({ label, value: prometPoMesecu.get(monthKey(d)) ?? 0 });
  }

  // Pregled po mesecu (tekući + 3 unapred): promet, troškovi i zarada za
  // porudžbine već zakazane za budućnost.
  const mesecniFin: MonthFin[] = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = monthKey(d);
    const meseca = orders.filter((o) => o.datum_isporuke.slice(0, 7) === key);
    mesecniFin.push({
      label: `${MESECI[d.getMonth()]} ${d.getFullYear()}`,
      broj: meseca.length,
      promet: meseca.reduce((s, o) => s + ukupnaCena(o), 0),
      trosak: meseca.reduce((s, o) => s + trosak(o), 0),
      zarada: meseca.reduce((s, o) => s + zarada(o), 0),
      tekuci: i === 0,
    });
  }

  // Rangiranja (kupci / gradovi / proizvodi) prate izabrani period.
  const grp = (keyFn: (o: (typeof orders)[number]) => string, valFn: (o: (typeof orders)[number]) => number) => {
    const m = new Map<string, { v: number; n: number }>();
    for (const o of periodOrders) {
      const k = (keyFn(o) || "—").trim() || "—";
      const cur = m.get(k) ?? { v: 0, n: 0 };
      cur.v += valFn(o);
      cur.n += 1;
      m.set(k, cur);
    }
    return [...m.entries()].map(([label, x]) => ({ label, value: x.v, sub: `${x.n} porudžbina` }));
  };

  const kupci = grp((o) => o.kupac_ime, ukupnaCena).sort((a, b) => b.value - a.value).slice(0, 5);
  const gradovi = grp((o) => o.grad ?? "—", ukupnaCena).sort((a, b) => b.value - a.value).slice(0, 6);
  // Najprodavaniji proizvod — grupiši po GLAVNOM proizvodu (prva reč naziva).
  // Npr. „strudla mak", „strudla orasi" i „strudla" spadaju pod „strudla";
  // brojimo svaku stavku (kolač), a ne porudžbinu.
  const glavniProizvod = (naziv: string) => naziv.trim().split(/\s+/)[0] ?? "";
  const prodMap = new Map<string, Row>();
  for (const o of periodOrders) {
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

  // ── Transport: realan trošak za izabrani mesec ─────────────────────
  const currentKey = monthKey(now);
  const monthsSet = new Set<string>(orders.map((o) => o.datum_isporuke.slice(0, 7)));
  monthsSet.add(currentKey);
  const monthOptions = [...monthsSet].sort().reverse().map((k) => {
    const [y, m] = k.split("-").map(Number);
    return { key: k, label: `${MESECI[m - 1]} ${y}` };
  });
  const selMesec = sp.mesec && monthsSet.has(sp.mesec) ? sp.mesec : currentKey;
  const selLabel = monthOptions.find((o) => o.key === selMesec)?.label ?? "";
  const mesecOrders = orders.filter((o) => o.datum_isporuke.slice(0, 7) === selMesec);
  const tr = mesecOrders.reduce(
    (a, o) => {
      if (o.transport_km != null && o.transport_km > 0) a.dostava += 1;
      a.km += o.transport_km ?? 0;
      a.litara += o.transport_litara ?? 0;
      a.gorivo += o.transport_gorivo ?? 0;
      a.amortizacija += o.transport_amortizacija ?? 0;
      a.putarina += o.transport_putarina ?? 0;
      a.naplaceno += o.transport_cena ?? 0;
      return a;
    },
    { dostava: 0, km: 0, litara: 0, gorivo: 0, amortizacija: 0, putarina: 0, naplaceno: 0 }
  );
  // Amortizacija se trenutno ne prikazuje (interni trošak) — trošak = gorivo + putarina.
  const trTrosak = tr.gorivo + tr.putarina;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">
          Prodaja — <span className="font-semibold text-ink capitalize">{periodLabel}</span>
        </p>
        <PeriodSelect value={period} />
      </div>

      <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3">
        <Kpi fit label="Ukupan promet" value={formatRSD(promet)} />
        <Kpi label="Broj porudžbina" value={String(periodOrders.length)} />
        <Kpi label="Broj kupaca" value={String(brojKupaca)} />
        <Kpi fit label="Prosečna porudžbina" value={formatRSD(prosek)} />
        <Kpi fit label="Ukupni troškovi" value={formatRSD(trosakUk)} />
        <Kpi fit label="Ukupna zarada" value={formatRSD(zaradaUk)} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg">Troškovi prevoza — <span className="capitalize">{selLabel}</span></h2>
          <MonthSelect value={selMesec} options={monthOptions} />
        </div>
        <div className="grid grid-cols-2 min-[861px]:grid-cols-3 gap-3">
          <Kpi sm fit label={`Gorivo (${formatNum(tr.litara, 1)} l)`} value={formatRSD(tr.gorivo)} />
          <Kpi sm fit label="Putarina" value={formatRSD(tr.putarina)} />
          <Kpi sm fit label="Ukupan trošak" value={formatRSD(trTrosak)} />
        </div>
        <div className="grid grid-cols-2 min-[861px]:grid-cols-4 gap-3 mt-3">
          <Kpi sm label="Broj dostava" value={String(tr.dostava)} />
          <Kpi sm label="Pređeno (povratno)" value={`${formatNum(tr.km, 0)} km`} />
          <Kpi sm fit label="Naplaćeno za dostavu" value={formatRSD(tr.naplaceno)} />
          <Kpi sm fit label="Naplaćeno − trošak" value={formatRSD(tr.naplaceno - trTrosak)} />
        </div>
        {tr.dostava === 0 && (
          <p className="text-sm text-muted mt-3">Nema zabeleženih dostava sa kilometražom za ovaj mesec.</p>
        )}
      </div>

      <MonthFinanceList title="Po mesecu — promet, trošak i zarada" rows={mesecniFin} />
      <BarList title={`Promet po mesecu (poslednjih ${chartN})`} rows={mesecni} color="var(--accent)" money />
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
              <FinCell label="Troškovi" value={r.trosak} />
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
