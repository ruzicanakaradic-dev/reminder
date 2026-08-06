import { Suspense } from "react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders } from "@/lib/data";
import { OrdersTable } from "@/components/OrdersTable";
import { OrderFilters } from "@/components/OrderFilters";
import { SetupNotice } from "@/components/SetupNotice";
import { EmptyState } from "@/components/ui";
import type { Order, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: Status[] = ["primljena", "u_radu", "zavrseno", "isporuceno"];

export default async function PorudzbinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const sp = await searchParams;
  const status = sp.status as Status | undefined;

  const orders = await getOrders({
    status: status && VALID.includes(status) ? status : undefined,
    search: sp.q,
  });
  // najnovija isporuka prvo
  const sorted = [...orders].sort((a: Order, b: Order) =>
    b.datum_isporuke.localeCompare(a.datum_isporuke)
  );

  return (
    <div className="space-y-4 animate-in">
      <Suspense fallback={null}>
        <OrderFilters />
      </Suspense>

      {sorted.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="Nema porudžbina"
          hint="Dodaj prvu porudžbinu i pojaviće se ovde."
          cta={{ href: "/porudzbine/nova", label: "Nova porudžbina" }}
        />
      ) : (
        <OrdersTable orders={sorted} />
      )}
    </div>
  );
}
