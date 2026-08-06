"use client";

import { useRouter } from "next/navigation";
import type { Order } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRSD, formatKg, formatDatumKratko } from "@/lib/format";

export function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto border border-[var(--divider)] rounded-[16px]">
      <table className="table" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Kupac</th>
            <th>Porudžbina</th>
            <th>Isporuka</th>
            <th>Grad</th>
            <th>Težina</th>
            <th>Iznos</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} onClick={() => router.push(`/porudzbine/${o.id}`)}>
              <td className="text-muted tabular-nums">{o.redni_broj}</td>
              <td className="font-extrabold">{o.kupac_ime}</td>
              <td>{o.proizvod}</td>
              <td className="whitespace-nowrap">
                {formatDatumKratko(o.datum_isporuke)}
                {o.vreme_isporuke ? ` · ${o.vreme_isporuke}` : ""}
              </td>
              <td>{o.grad ?? "—"}</td>
              <td className="whitespace-nowrap">{formatKg(o.tezina_kg)}</td>
              <td className="whitespace-nowrap font-extrabold">{formatRSD(o.total)}</td>
              <td>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
