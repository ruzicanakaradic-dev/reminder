import { notFound } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomers, getOrder } from "@/lib/data";
import { OrderForm } from "@/components/OrderForm";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function IzmenaPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const [order, customers] = await Promise.all([getOrder(id), getCustomers()]);
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title={`Izmena #${order.redni_broj}`} subtitle={order.proizvod} />
      <OrderForm order={order} customers={customers.map((c) => ({ ime: c.ime, telefon: c.telefon }))} />
    </div>
  );
}
