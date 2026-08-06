import { supabaseConfigured } from "@/lib/supabase/admin";
import { getStats, type StatBucket } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/types";
import { formatRSD, formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatistikaPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const s = await getStats();

  if (s.ukupnoPorudzbina === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Statistika" />
        <EmptyState
          emoji="📊"
          title="Nema podataka"
          hint="Statistika će se popuniti čim dodaš porudžbine."
          cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Statistika" subtitle="Pregled poslovanja" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Porudžbina" value={String(s.ukupnoPorudzbina)} />
        <Stat label="Ukupan prihod" value={formatRSD(s.ukupanPrihod)} accent="var(--rose-600)" />
        <Stat label="Ukupno kg" value={formatKg(s.ukupnoKg)} />
        <Stat label="Isporučeno" value={String(s.poStatusu.isporuceno)} accent="var(--isporuceno)" />
      </div>

      {/* Po statusu */}
      <div className="card p-5">
        <h2 className="display text-lg font-semibold text-ink mb-3">Po statusu</h2>
        <div className="grid grid-cols-3 gap-3">
          {(["u_radu", "zavrseno", "isporuceno"] as const).map((st) => (
            <div key={st} className="text-center">
              <div className="text-2xl font-bold" style={{ color: `var(--${st.replace("_", "-")})` }}>
                {s.poStatusu[st]}
              </div>
              <div className="text-xs text-muted">{STATUS_LABEL[st]}</div>
            </div>
          ))}
        </div>
      </div>

      <BarSection title="Najbolji kupci" buckets={s.poKupcu} unit="prihod" />
      <BarSection title="Po gradu" buckets={s.poGradu} unit="prihod" />
      <BarSection title="Najtraženiji proizvodi" buckets={s.poProizvodu} unit="broj" />
    </div>
  );
}

function BarSection({
  title,
  buckets,
  unit,
}: {
  title: string;
  buckets: StatBucket[];
  unit: "prihod" | "broj";
}) {
  const top = buckets.slice(0, 8);
  const max = Math.max(1, ...top.map((b) => (unit === "prihod" ? b.prihod : b.brojPorudzbina)));

  return (
    <div className="card p-5">
      <h2 className="display text-lg font-semibold text-ink mb-4">{title}</h2>
      <div className="space-y-3">
        {top.map((b) => {
          const val = unit === "prihod" ? b.prihod : b.brojPorudzbina;
          const pct = Math.round((val / max) * 100);
          return (
            <div key={b.kljuc}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-ink truncate pr-2">{b.kljuc}</span>
                <span className="text-muted shrink-0">
                  {unit === "prihod" ? formatRSD(b.prihod) : `${b.brojPorudzbina} kom`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-sand overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--rose-400), var(--rose-600))",
                  }}
                />
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {b.brojPorudzbina} porudžbina · {formatKg(b.kg)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
