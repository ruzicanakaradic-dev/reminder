import { Suspense } from "react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders } from "@/lib/data";
import { OrderCard } from "@/components/OrderCard";
import { OrderFilters } from "@/components/OrderFilters";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PorudzbinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const sp = await searchParams;
  const status = sp.status as Status | undefined;
  const q = sp.q;

  const orders = await getOrders({
    status: status && ["u_radu", "zavrseno", "isporuceno"].includes(status) ? status : undefined,
    search: q,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Porudžbine" subtitle={`${orders.length} rezultata`} />
      <Suspense fallback={null}>
        <OrderFilters />
      </Suspense>

      {orders.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="Nema porudžbina"
          hint="Dodaj prvu porudžbinu i pojaviće se ovde."
          cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
