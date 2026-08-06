import Link from "next/link";
import { Phone, ChevronRight } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomers, getOrders } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatRSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KupciPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const [customers, orders] = await Promise.all([getCustomers(), getOrders()]);

  const agg = new Map<string, { broj: number; prihod: number }>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const a = agg.get(o.customer_id) ?? { broj: 0, prihod: 0 };
    a.broj += 1;
    a.prihod += o.total ?? 0;
    agg.set(o.customer_id, a);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Kupci" subtitle={`${customers.length} u bazi`} />

      {customers.length === 0 ? (
        <EmptyState
          emoji="👩‍🍳"
          title="Još nema kupaca"
          hint="Kupci se automatski dodaju kada napraviš porudžbinu."
          cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }}
        />
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => {
            const a = agg.get(c.id) ?? { broj: 0, prihod: 0 };
            return (
              <Link key={c.id} href={`/kupci/${c.id}`} className="card p-4 flex items-center gap-3 animate-in">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-rose-100 text-rose-600 font-bold shrink-0">
                  {c.ime.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-400">#{c.redni_broj}</span>
                    <span className="font-semibold text-ink truncate">{c.ime}</span>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-3 mt-0.5">
                    {c.telefon && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {c.telefon}
                      </span>
                    )}
                    <span>{a.broj} porudžbina</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-rose-600 text-sm">{formatRSD(a.prihod)}</div>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
