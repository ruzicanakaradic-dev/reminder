import Link from "next/link";
import { Plus, PartyPopper } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders, getStats } from "@/lib/data";
import { OrderCard } from "@/components/OrderCard";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader, Stat } from "@/components/ui";
import { danaDo, toISODate, formatDatum, danUNedelji } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DanasPage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const danas = new Date();
  const za7 = new Date();
  za7.setDate(danas.getDate() + 7);

  const [predstojece, stats] = await Promise.all([
    getOrders({ to: toISODate(za7) }),
    getStats(),
  ]);

  const aktivne = predstojece.filter((o) => o.status !== "isporuceno");
  const kasne = aktivne.filter((o) => danaDo(o.datum_isporuke) < 0);
  const zaDanas = aktivne.filter((o) => danaDo(o.datum_isporuke) === 0);
  const uskoro = aktivne.filter((o) => {
    const d = danaDo(o.datum_isporuke);
    return d >= 1 && d <= 2;
  });
  const kasnije = aktivne.filter((o) => danaDo(o.datum_isporuke) > 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dobrodošla, Ruže 🌹"
        subtitle={`${danUNedelji(danas)}, ${formatDatum(danas)}`}
        action={
          <Link href="/porudzbine/nova" className="btn btn-primary hidden sm:inline-flex">
            <Plus size={18} /> Nova
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Za danas" value={String(zaDanas.length)} accent="var(--rose-600)" />
        <Stat label="U radu" value={String(stats.poStatusu.u_radu)} accent="var(--u-radu)" />
        <Stat label="Sve porudžbine" value={String(stats.ukupnoPorudzbina)} />
      </div>

      {kasne.length > 0 && (
        <Section title="⚠ Kasni — hitno" count={kasne.length}>
          {kasne.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Section>
      )}

      <Section title="Isporuka danas" count={zaDanas.length}>
        {zaDanas.length === 0 ? (
          <div className="card p-6 text-center text-muted flex flex-col items-center gap-2">
            <PartyPopper className="text-rose-400" />
            Nema isporuka za danas. Uživaj u kafi ☕
          </div>
        ) : (
          zaDanas.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </Section>

      {uskoro.length > 0 && (
        <Section title="Pripremi — sledeća 2 dana" count={uskoro.length}>
          {uskoro.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Section>
      )}

      {kasnije.length > 0 && (
        <Section title="Uskoro (do 7 dana)" count={kasnije.length}>
          {kasnije.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </Section>
      )}

      {aktivne.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">🧁</div>
          <div className="display text-xl font-semibold">Sve je pod kontrolom</div>
          <p className="text-muted text-sm mt-1">Nema aktivnih porudžbina u narednih 7 dana.</p>
          <Link href="/porudzbine/nova" className="btn btn-primary mt-4 inline-flex">
            <Plus size={18} /> Dodaj porudžbinu
          </Link>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="display text-lg font-semibold text-ink">{title}</h2>
        <span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
