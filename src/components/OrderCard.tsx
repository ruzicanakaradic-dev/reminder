import Link from "next/link";
import { CalendarClock, MapPin, Scale, User } from "lucide-react";
import type { Order } from "@/lib/types";
import { StatusControl } from "@/components/StatusControl";
import { formatRSD, formatKg, formatDatum, danaDo, relativnoDana } from "@/lib/format";

export function OrderCard({ order }: { order: Order }) {
  const dana = danaDo(order.datum_isporuke);
  const hitno = order.status !== "isporuceno" && dana <= 2;
  const kasni = order.status !== "isporuceno" && dana < 0;

  return (
    <div className="card p-4 animate-in">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/porudzbine/${order.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-400">#{order.redni_broj}</span>
            {hitno && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: kasni ? "#ffe0ea" : "#fef1e0",
                  color: kasni ? "#cf3468" : "#9a5a10",
                }}
              >
                {kasni ? "⚠ Kasni" : "Uskoro"}
              </span>
            )}
          </div>
          <div className="display text-lg font-semibold text-ink truncate mt-0.5">
            {order.proizvod}
          </div>
          <div className="mt-1.5 space-y-1 text-sm text-muted">
            <div className="flex items-center gap-1.5">
              <User size={14} /> <span className="truncate">{order.kupac_ime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarClock size={14} />
              <span className={hitno ? "font-semibold" : ""} style={{ color: hitno ? "var(--rose-600)" : undefined }}>
                Isporuka {relativnoDana(dana)} · {formatDatum(order.datum_isporuke)}
              </span>
            </div>
            {order.grad && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} /> <span className="truncate">{order.grad}</span>
              </div>
            )}
            {order.tezina_kg != null && (
              <div className="flex items-center gap-1.5">
                <Scale size={14} /> {formatKg(order.tezina_kg)}
              </div>
            )}
          </div>
        </Link>

        <div className="text-right shrink-0">
          <div className="display text-lg font-semibold text-rose-600">{formatRSD(order.total)}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <StatusControl id={order.id} status={order.status} size="sm" />
      </div>
    </div>
  );
}
