import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrders } from "@/lib/data";
import { CalendarView } from "@/components/CalendarView";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KalendarPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const orders = await getOrders();

  return (
    <div className="space-y-4">
      <PageHeader title="Kalendar" subtitle="Šta i kada treba da se uradi" />

      <div className="flex flex-wrap gap-3">
        {STATUS_ORDER.map((s) => (
          <span key={s} className={`chip status-${s}`}>
            <span className="chip-dot" />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <CalendarView orders={orders} />
    </div>
  );
}
