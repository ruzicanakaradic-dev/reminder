import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomers } from "@/lib/data";
import { OrderForm } from "@/components/OrderForm";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NovaPorudzbinaPage() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const customers = await getCustomers();

  return (
    <div className="space-y-5">
      <PageHeader title="Nova porudžbina" subtitle="Unesi detalje nove porudžbine" />
      <OrderForm customers={customers.map((c) => ({ ime: c.ime, telefon: c.telefon, grad: c.grad, adresa: c.adresa }))} />
    </div>
  );
}
