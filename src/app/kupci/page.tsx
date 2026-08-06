import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomers, getOrders } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState } from "@/components/ui";
import { customerCode } from "@/lib/types";
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

  if (customers.length === 0) {
    return (
      <EmptyState
        emoji="👩‍🍳"
        title="Još nema kupaca"
        hint="Kupci se automatski dodaju kada napraviš porudžbinu."
        cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-3 animate-in">
      {customers.map((c) => {
        const a = agg.get(c.id) ?? { broj: 0, prihod: 0 };
        return (
          <Link key={c.id} href={`/kupci/${c.id}`} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[17px] font-extrabold">{c.ime}</span>
              <span className="text-[12px] font-extrabold" style={{ color: "var(--accent)" }}>
                {customerCode(c.redni_broj)}
              </span>
            </div>
            <div className="text-xs text-muted flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {c.telefon && <span className="flex items-center gap-1"><Phone size={12} /> {c.telefon}</span>}
              {c.grad && <span className="flex items-center gap-1"><MapPin size={12} /> {c.grad}</span>}
            </div>
            <div className="mt-3 pt-3 flex justify-between text-sm" style={{ borderTop: "2px solid var(--divider)" }}>
              <span className="text-muted">{a.broj} porudžbina</span>
              <span className="font-extrabold" style={{ color: "var(--accent)" }}>{formatRSD(a.prihod)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
