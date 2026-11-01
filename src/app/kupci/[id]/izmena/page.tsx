import { notFound } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getCustomer } from "@/lib/data";
import { CustomerForm } from "@/components/CustomerForm";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui";
import { customerCode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IzmenaKupcaPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const kupac = await getCustomer(id);
  if (!kupac) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title={`Izmena kupca`} subtitle={`${kupac.ime} · ${customerCode(kupac.redni_broj)}`} />
      <CustomerForm customer={kupac} />
    </div>
  );
}
