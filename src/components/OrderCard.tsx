import Link from "next/link";
import type { Order, Status } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRSD, formatKg, danaDo, relativnoDana } from "@/lib/format";

export const STATUS_DOT: Record<Status, string> = {
  primljena: "#9a8fa0",
  u_radu: "#7a3785",
  zavrseno: "#977128",
  isporuceno: "#34233b",
};

export function OrderCard({ order }: { order: Order }) {
  const dana = danaDo(order.datum_isporuke);
  const hitno = order.status !== "isporuceno" && dana <= 2;

  return (
    <Link
      href={`/porudzbine/${order.id}`}
      className="card animate-in flex flex-col gap-1.5 p-3.5"
      style={{ borderLeft: `4px solid ${STATUS_DOT[order.status]}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] font-extrabold leading-tight">{order.kupac_ime}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="text-[14px]">{order.proizvod}</div>
      <div className="text-[12px] text-muted flex flex-wrap gap-x-3 gap-y-0.5">
        {order.tezina_kg != null && <span>{formatKg(order.tezina_kg)}</span>}
        <span className="font-bold" style={{ color: "var(--ink)" }}>
          {formatRSD(order.total)}
        </span>
        {order.grad && <span>{order.grad}</span>}
      </div>
      <div className="text-[12px]" style={{ color: hitno ? "var(--accent)" : "var(--neutral-600)" }}>
        Isporuka {relativnoDana(dana)}
        {order.vreme_isporuke ? ` · ${order.vreme_isporuke}` : ""} · #{order.redni_broj}
      </div>
    </Link>
  );
}
