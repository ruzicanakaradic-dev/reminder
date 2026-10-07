import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Truck } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { getOrder, getCustomer } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusControl } from "@/components/StatusControl";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";
import { customerCode } from "@/lib/types";
import { formatRSD, formatKg, formatNum, formatDatum, danaDo, relativnoDana } from "@/lib/format";
import { proizvodnaCena, trosak, trosakPrevoza, ukupnaCena, zarada, COST_RATE } from "@/lib/costs";
import { PhoneActions } from "@/components/PhoneActions";
import { AddressActions } from "@/components/AddressActions";

export const dynamic = "force-dynamic";

export default async function PorudzbinaDetalj({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) return <SetupNotice />;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const kupac = order.customer_id ? await getCustomer(order.customer_id) : null;
  const dana = danaDo(order.datum_isporuke);
  const hitno = order.status !== "isporuceno" && dana <= 2;
  const dekoracija = order.dekoracija_cena ?? 0;
  const prevoz = trosakPrevoza(order);
  const imaDostavu = order.transport_cena != null;

  return (
    <div className="space-y-4 animate-in max-w-2xl">
      <div className="flex items-center justify-between">
        <Link href="/porudzbine" className="btn btn-ghost text-sm !px-2">
          <ArrowLeft size={16} /> Porudžbine
        </Link>
        <Link href={`/porudzbine/${order.id}/izmena`} className="btn btn-secondary text-sm">
          <Pencil size={16} /> Izmeni
        </Link>
      </div>

      <div className="card p-5" style={{ borderLeft: `4px solid ${STATUS_DOTS[order.status]}` }}>
        <div className="kicker">
          Porudžbina #{order.redni_broj}
          {kupac ? ` · ${customerCode(kupac.redni_broj)}` : ""}
        </div>
        <h2 className="text-2xl mt-1">{order.kupac_ime}</h2>

        <div className="mt-4">
          <div className="label">Status</div>
          <StatusControl id={order.id} status={order.status} />
        </div>
      </div>

      {hitno && (
        <div className="card p-4 flex items-center gap-3" style={{ borderColor: "var(--accent)", borderWidth: 2 }}>
          <span className="text-2xl">⏰</span>
          <div className="text-sm">
            <b style={{ color: "var(--accent)" }}>Isporuka {relativnoDana(dana)}!</b>{" "}
            <span className="text-muted">Vreme je za pripremu.</span>
          </div>
        </div>
      )}

      {/* Stavke (proizvodi) */}
      <div className="card p-5">
        <div className="kicker mb-3">Proizvodi</div>
        <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
          {(order.items && order.items.length ? order.items : []).map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
              <div className="min-w-0">
                <div className="font-bold leading-tight">{it.naziv}</div>
                <div className="text-[12px] text-muted mt-0.5">
                  {it.tezina_kg != null ? formatKg(it.tezina_kg) : "—"}
                  {it.cena_po_kg != null ? ` · ${formatRSD(it.cena_po_kg)}/kg` : ""}
                </div>
              </div>
              <div className="font-extrabold shrink-0">{formatRSD(it.total)}</div>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && (
            <div className="py-2 text-sm text-muted">{order.proizvod}</div>
          )}
        </div>
      </div>

      {order.opis && (
        <div className="card p-5">
          <div className="kicker mb-2">Opis / dodatak</div>
          <p className="text-sm whitespace-pre-wrap">{order.opis}</p>
        </div>
      )}

      <div className="card p-5 grid sm:grid-cols-2 gap-x-6 gap-y-3">
        <div className="sm:col-span-2">
          <div className="kicker" style={{ fontSize: 11 }}>Kontakt (mobilni)</div>
          <div className="mt-1">
            <PhoneActions telefon={order.kupac_telefon} variant="inline" />
          </div>
        </div>
        <Info label="Grad" value={order.grad || "—"} />
        <div className="sm:col-span-2">
          <div className="kicker" style={{ fontSize: 11 }}>Adresa isporuke</div>
          <div className="mt-0.5">
            <AddressActions adresa={order.adresa} grad={order.grad} />
          </div>
        </div>
        <Info label="Datum porudžbine" value={formatDatum(order.datum_porudzbine)} />
        <Info label="Datum isporuke" value={`${formatDatum(order.datum_isporuke)}${order.vreme_isporuke ? " · " + order.vreme_isporuke : ""}`} />
        <Info label="Ukupna težina" value={formatKg(order.tezina_kg)} />
      </div>

      <div className="card p-0 overflow-hidden" style={{ background: "var(--accent-100)", borderColor: "var(--accent-300)" }}>
        {/* Šta ulazi u cenu: proizvodi + dekoracija + dostava */}
        {(dekoracija > 0 || imaDostavu) && (
          <div className="px-5 pt-4 space-y-1.5">
            <Stavka label="Proizvodi" value={formatRSD(order.total)} />
            {dekoracija > 0 && <Stavka label="Dekoracija / toper" value={formatRSD(dekoracija)} />}
            {imaDostavu && (
              <Stavka label="Dostava" value={order.transport_cena === 0 ? "besplatna" : formatRSD(order.transport_cena)} />
            )}
          </div>
        )}
        {/* Ukupna (prodajna) cena — najbitniji red */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="kicker" style={{ color: "var(--accent-800)" }}>Ukupno za naplatu</span>
          <span className="text-[28px] leading-none font-extrabold" style={{ color: "var(--accent-800)" }}>
            {formatRSD(ukupnaCena(order))}
          </span>
        </div>
        {/* Troškovi: proizvodnja + dekoracija + gorivo/putarina */}
        <div className="px-5 py-3 border-t space-y-1.5" style={{ borderColor: "var(--accent-300)" }}>
          <Stavka
            label={<>Proizvodnja <span className="text-muted font-normal">(~{Math.round(COST_RATE * 100)}% proizvoda)</span></>}
            value={formatRSD(proizvodnaCena(order.total))}
          />
          {dekoracija > 0 && <Stavka label="Dekoracija / toper" value={formatRSD(dekoracija)} />}
          {prevoz > 0 && <Stavka label="Gorivo + putarina" value={formatRSD(prevoz)} />}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold" style={{ color: "var(--accent-800)" }}>Ukupan trošak</span>
            <span className="text-xl font-extrabold" style={{ color: "var(--accent-800)" }}>
              {formatRSD(trosak(order))}
            </span>
          </div>
        </div>
        {/* Zarada */}
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--accent-300)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--accent-800)" }}>Zarada</span>
          <span className="text-xl font-extrabold" style={{ color: "var(--accent-800)" }}>
            {formatRSD(zarada(order))}
          </span>
        </div>
        <div className="px-5 py-2.5 text-[11px] text-muted border-t" style={{ borderColor: "var(--accent-300)" }}>
          Proizvodnja je gruba procena (materijal + izrada ≈ {Math.round(COST_RATE * 100)}% cene proizvoda).
          Dekoracija, gorivo i putarina se naplaćuju kupcu, ali idu u trošak — ne u zaradu.
        </div>
      </div>

      {(order.transport_km != null || order.transport_cena != null) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} style={{ color: "var(--accent)" }} />
            <div className="kicker !mb-0">Transport / dostava</div>
          </div>

          {order.transport_km != null && (
            <div className="grid grid-cols-2 gap-2 text-center mb-3">
              <TransportInfo
                label={`Gorivo${order.transport_litara != null ? ` (${formatNum(order.transport_litara, 1)} l)` : ""}`}
                value={order.transport_gorivo}
              />
              <TransportInfo label="Putarina" value={order.transport_putarina} />
            </div>
          )}

          <div className="space-y-2">
            {order.transport_km != null && (
              <Row label={`Realan trošak (${formatNum(order.transport_km, 0)} km, povratno)`}
                value={formatRSD((order.transport_gorivo ?? 0) + (order.transport_putarina ?? 0))} />
            )}
            {order.transport_predlog != null && (
              <Row label="Predložena cena" value={formatRSD(order.transport_predlog)} muted />
            )}
            <div className="flex items-center justify-between rounded-[12px] px-4 py-3"
              style={{ background: "var(--accent-100)", border: "1px solid var(--accent-300)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--accent-800)" }}>Naplaćena dostava</span>
              <span className="text-xl font-extrabold" style={{ color: "var(--accent-800)" }}>{formatRSD(order.transport_cena)}</span>
            </div>
          </div>
        </div>
      )}

      {order.napomena && (
        <div className="card p-4" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div className="kicker mb-1">Posebna želja / napomena</div>
          <p className="text-sm whitespace-pre-wrap">{order.napomena}</p>
        </div>
      )}

      {order.slika && (
        <div className="card p-3">
          <div className="kicker mb-2">Slika primera</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.slika} alt="Primer" className="w-full rounded-[10px] grayscale" />
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted">Sačuvano: {formatDatum(order.created_at.slice(0, 10))}</span>
        <DeleteOrderButton id={order.id} />
      </div>
    </div>
  );
}

const STATUS_DOTS: Record<string, string> = {
  primljena: "#9a8fa0",
  u_radu: "#7a3785",
  zavrseno: "#977128",
  isporuceno: "#34233b",
};

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="kicker" style={{ fontSize: 11 }}>{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}

function TransportInfo({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[10px] py-2 px-1" style={{ background: "var(--surface)", border: "1px solid var(--divider)" }}>
      <div className="kicker" style={{ fontSize: 10 }}>{label}</div>
      <div className="mt-0.5 font-bold tabular-nums" style={{ fontSize: 14 }}>{formatRSD(value)}</div>
    </div>
  );
}

function Stavka({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm" style={{ color: "var(--accent-800)" }}>
      <span className="font-semibold">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted" : "font-semibold"}>{label}</span>
      <span className={`tabular-nums ${muted ? "text-muted" : "font-bold"}`}>{value}</span>
    </div>
  );
}
