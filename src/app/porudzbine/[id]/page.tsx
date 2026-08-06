import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Phone, MapPin, Calendar, CalendarClock, Scale, Coins, User } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrder } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusControl } from "@/components/StatusControl";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";
import { formatRSD, formatKg, formatDatum, danaDo, relativnoDana } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PorudzbinaDetalj({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const dana = danaDo(order.datum_isporuke);
  const hitno = order.status !== "isporuceno" && dana <= 2;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/porudzbine" className="btn btn-ghost text-sm">
          <ArrowLeft size={16} /> Porudžbine
        </Link>
        <Link href={`/porudzbine/${order.id}/izmena`} className="btn btn-soft text-sm">
          <Pencil size={16} /> Izmeni
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-rose-400">Porudžbina #{order.redni_broj}</div>
            <h1 className="display text-2xl font-semibold text-ink mt-1">{order.proizvod}</h1>
          </div>
          <div className="text-right">
            <div className="display text-2xl font-semibold text-rose-600">{formatRSD(order.total)}</div>
          </div>
        </div>

        {order.opis && (
          <p className="mt-3 text-ink/80 bg-sand rounded-xl p-3 text-sm whitespace-pre-wrap">
            {order.opis}
          </p>
        )}

        <div className="mt-5">
          <div className="label">Status porudžbine</div>
          <StatusControl id={order.id} status={order.status} />
        </div>
      </div>

      {hitno && (
        <div
          className="card p-4 flex items-center gap-3"
          style={{ background: "#fff1f5", borderColor: "var(--rose-200)" }}
        >
          <span className="text-2xl">⏰</span>
          <div className="text-sm">
            <b className="text-rose-700">Isporuka {relativnoDana(dana)}!</b>{" "}
            <span className="text-muted">Vreme je za pripremu.</span>
          </div>
        </div>
      )}

      <div className="card p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <Info icon={<User size={16} />} label="Kupac" value={order.kupac_ime} />
        <Info
          icon={<Phone size={16} />}
          label="Kontakt"
          value={
            order.kupac_telefon ? (
              <a href={`tel:${order.kupac_telefon}`} className="text-rose-600 font-semibold">
                {order.kupac_telefon}
              </a>
            ) : (
              "—"
            )
          }
        />
        <Info icon={<Calendar size={16} />} label="Datum porudžbine" value={formatDatum(order.datum_porudzbine)} />
        <Info
          icon={<CalendarClock size={16} />}
          label="Datum isporuke"
          value={`${formatDatum(order.datum_isporuke)} · ${relativnoDana(dana)}`}
        />
        <Info icon={<Scale size={16} />} label="Težina" value={formatKg(order.tezina_kg)} />
        <Info icon={<Coins size={16} />} label="Cena po kg" value={formatRSD(order.cena_po_kg)} />
        <Info
          icon={<MapPin size={16} />}
          label="Adresa isporuke"
          value={order.adresa || "—"}
        />
        <Info icon={<MapPin size={16} />} label="Grad" value={order.grad || "—"} />
      </div>

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted">Sačuvano: {formatDatum(order.created_at.slice(0, 10))}</span>
        <DeleteOrderButton id={order.id} />
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="text-ink mt-0.5 font-medium">{value}</div>
    </div>
  );
}
