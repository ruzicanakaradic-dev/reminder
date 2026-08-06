"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Order, Status } from "@/lib/types";
import { OrderCard } from "@/components/OrderCard";
import {
  DANI_KRATKO,
  MESECI,
  parseDate,
  toISODate,
  formatDatum,
  danUNedelji,
  formatRSD,
} from "@/lib/format";

type View = "dan" | "nedelja" | "mesec";
const STATUS_COLOR: Record<Status, string> = {
  u_radu: "var(--u-radu)",
  zavrseno: "var(--zavrseno)",
  isporuceno: "var(--isporuceno)",
};

export function CalendarView({ orders }: { orders: Order[] }) {
  const [view, setView] = useState<View>("mesec");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISODate(new Date()));

  const byDay = useMemo(() => {
    const m = new Map<string, Order[]>();
    for (const o of orders) {
      const arr = m.get(o.datum_isporuke) ?? [];
      arr.push(o);
      m.set(o.datum_isporuke, arr);
    }
    return m;
  }, [orders]);

  const naslov =
    view === "mesec"
      ? `${MESECI[cursor.getMonth()]} ${cursor.getFullYear()}.`
      : view === "nedelja"
        ? nedeljaLabel(cursor)
        : formatDatum(cursor);

  const pomeri = (smer: 1 | -1) => {
    if (view === "mesec") setCursor((c) => addMonths(c, smer));
    else if (view === "nedelja") setCursor((c) => addWeeks(c, smer));
    else {
      const n = addDays(cursor, smer);
      setCursor(n);
      setSelected(toISODate(n));
    }
  };

  const danas = () => {
    const n = new Date();
    setCursor(n);
    setSelected(toISODate(n));
  };

  return (
    <div className="space-y-4">
      {/* Prekidač prikaza */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-sand p-1 gap-1">
          {(["dan", "nedelja", "mesec"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="rounded-full text-sm font-semibold px-3.5 py-1.5 capitalize transition-all"
              style={{
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "var(--rose-600)" : "var(--muted)",
                boxShadow: view === v ? "0 1px 4px rgba(61,43,52,.12)" : "none",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <button onClick={danas} className="btn btn-ghost text-sm">
          Danas
        </button>
      </div>

      {/* Navigacija */}
      <div className="flex items-center justify-between">
        <button onClick={() => pomeri(-1)} className="btn btn-ghost !p-2" aria-label="Prethodno">
          <ChevronLeft size={20} />
        </button>
        <div className="display text-lg font-semibold text-ink capitalize">{naslov}</div>
        <button onClick={() => pomeri(1)} className="btn btn-ghost !p-2" aria-label="Sledeće">
          <ChevronRight size={20} />
        </button>
      </div>

      {view === "mesec" && (
        <MonthGrid cursor={cursor} byDay={byDay} selected={selected} onSelect={setSelected} />
      )}
      {view === "nedelja" && (
        <WeekGrid cursor={cursor} byDay={byDay} selected={selected} onSelect={setSelected} />
      )}

      {/* Lista za izabrani dan (mesec/nedelja) ili tekući dan */}
      {view !== "dan" ? (
        <DayList datum={selected} orders={byDay.get(selected) ?? []} />
      ) : (
        <DayList datum={toISODate(cursor)} orders={byDay.get(toISODate(cursor)) ?? []} />
      )}
    </div>
  );
}

function StatusDots({ orders }: { orders: Order[] }) {
  const shown = orders.slice(0, 3);
  return (
    <div className="flex gap-0.5 justify-center mt-0.5">
      {shown.map((o) => (
        <span
          key={o.id}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: STATUS_COLOR[o.status] }}
        />
      ))}
      {orders.length > 3 && <span className="text-[9px] text-muted leading-none">+</span>}
    </div>
  );
}

function MonthGrid({
  cursor,
  byDay,
  selected,
  onSelect,
}: {
  cursor: Date;
  byDay: Map<string, Order[]>;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="card p-2 sm:p-3">
      <div className="grid grid-cols-7 mb-1">
        {["pon", "uto", "sre", "čet", "pet", "sub", "ned"].map((d) => (
          <div key={d} className="text-center text-[11px] font-bold text-muted py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = toISODate(d);
          const list = byDay.get(iso) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isSel = iso === selected;
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all"
              style={{
                background: isSel ? "var(--rose-500)" : list.length ? "var(--rose-50)" : "transparent",
                color: isSel ? "#fff" : inMonth ? "var(--ink)" : "var(--muted)",
                opacity: inMonth ? 1 : 0.4,
                border: isToday && !isSel ? "2px solid var(--rose-400)" : "2px solid transparent",
                fontWeight: isToday || isSel ? 700 : 500,
              }}
            >
              {d.getDate()}
              {list.length > 0 &&
                (isSel ? (
                  <span className="text-[10px] font-semibold">{list.length}</span>
                ) : (
                  <StatusDots orders={list} />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor,
  byDay,
  selected,
  onSelect,
}: {
  cursor: Date;
  byDay: Map<string, Order[]>;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const iso = toISODate(d);
        const list = byDay.get(iso) ?? [];
        const isToday = isSameDay(d, today);
        const isSel = iso === selected;
        return (
          <button
            key={iso}
            onClick={() => onSelect(iso)}
            className="card p-1.5 min-h-[84px] flex flex-col items-center transition-all"
            style={{
              background: isSel ? "var(--rose-500)" : "#fff",
              color: isSel ? "#fff" : "var(--ink)",
              border: isToday && !isSel ? "2px solid var(--rose-400)" : undefined,
            }}
          >
            <span className="text-[10px] font-bold uppercase" style={{ opacity: 0.7 }}>
              {DANI_KRATKO[d.getDay()]}
            </span>
            <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
            {list.length > 0 && (
              <span
                className="mt-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: isSel ? "rgba(255,255,255,.25)" : "var(--rose-100)",
                  color: isSel ? "#fff" : "var(--rose-600)",
                }}
              >
                {list.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayList({ datum, orders }: { datum: string; orders: Order[] }) {
  const d = parseDate(datum);
  const prihod = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 mt-2">
        <h3 className="display text-lg font-semibold text-ink capitalize">
          {danUNedelji(d)}, {d.getDate()}. {MESECI[d.getMonth()]}
        </h3>
        {orders.length > 0 && (
          <span className="text-sm font-semibold text-rose-600">{formatRSD(prihod)}</span>
        )}
      </div>
      {orders.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          <div className="text-3xl mb-1">🌤️</div>
          Nema porudžbina za ovaj dan.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function nedeljaLabel(cursor: Date): string {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.getDate()}–${end.getDate()}. ${MESECI[start.getMonth()]}`;
  return `${start.getDate()}. ${MESECI[start.getMonth()]} – ${end.getDate()}. ${MESECI[end.getMonth()]}`;
}
