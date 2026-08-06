"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek,
  isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import type { Order, Status } from "@/lib/types";
import { OrderCard } from "@/components/OrderCard";
import { DANI_KRATKO, MESECI, parseDate, toISODate, formatDatum, danUNedelji, formatRSD } from "@/lib/format";

type View = "mesec" | "nedelja" | "dan";

const STATUS_COLOR: Record<Status, string> = {
  primljena: "#9a8fa0",
  u_radu: "#7a3785",
  zavrseno: "#977128",
  isporuceno: "#34233b",
};
const STATUS_TINT: Record<Status, { bg: string; fg: string }> = {
  primljena: { bg: "#efe8ec", fg: "#5b4d62" },
  u_radu: { bg: "#e8d8ec", fg: "#3f1c48" },
  zavrseno: { bg: "#f7efd8", fg: "#574117" },
  isporuceno: { bg: "#e6e0e8", fg: "#34233b" },
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
    for (const arr of m.values())
      arr.sort((a, b) => (a.vreme_isporuke ?? "99").localeCompare(b.vreme_isporuke ?? "99"));
    return m;
  }, [orders]);

  const naslov =
    view === "mesec" ? `${MESECI[cursor.getMonth()]} ${cursor.getFullYear()}.`
    : view === "nedelja" ? nedeljaLabel(cursor)
    : formatDatum(cursor);

  const pomeri = (smer: 1 | -1) => {
    if (view === "mesec") setCursor((c) => addMonths(c, smer));
    else if (view === "nedelja") setCursor((c) => addWeeks(c, smer));
    else { const n = addDays(cursor, smer); setCursor(n); setSelected(toISODate(n)); }
  };
  const danas = () => { const n = new Date(); setCursor(n); setSelected(toISODate(n)); };
  const pickDay = (iso: string) => { setSelected(iso); setCursor(parseDate(iso)); setView("dan"); };

  return (
    <div className="space-y-4">
      {/* Segmented + nav */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="seg cal-seg max-[860px]:w-full">
          {(["mesec", "nedelja", "dan"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`seg-opt capitalize max-[860px]:flex-1 ${view === v ? "active" : ""}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex-1 max-[860px]:hidden" />
        <div className="flex items-center gap-2 max-[860px]:w-full max-[860px]:justify-between">
          <button onClick={() => pomeri(-1)} className="btn btn-secondary btn-icon" aria-label="Prethodno">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center font-extrabold text-[18px] max-[860px]:text-[16px] flex-1 min-w-[160px] capitalize">
            {naslov}
          </div>
          <button onClick={() => pomeri(1)} className="btn btn-secondary btn-icon" aria-label="Sledeće">
            <ChevronRight size={18} />
          </button>
          <button onClick={danas} className="btn btn-ghost text-sm">Danas</button>
        </div>
      </div>

      {view === "mesec" && <MonthGrid cursor={cursor} byDay={byDay} selected={selected} onPick={pickDay} onSelect={setSelected} />}
      {view === "nedelja" && <WeekGrid cursor={cursor} byDay={byDay} onPick={pickDay} />}

      {view !== "dan" ? (
        <DayList datum={selected} orders={byDay.get(selected) ?? []} />
      ) : (
        <DayList datum={toISODate(cursor)} orders={byDay.get(toISODate(cursor)) ?? []} />
      )}
    </div>
  );
}

function MonthGrid({ cursor, byDay, selected, onPick, onSelect }: {
  cursor: Date; byDay: Map<string, Order[]>; selected: string;
  onPick: (iso: string) => void; onSelect: (iso: string) => void;
}) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();
  const wd = ["pon", "uto", "sre", "čet", "pet", "sub", "ned"];

  return (
    <div
      className="grid grid-cols-7 gap-[2px] overflow-hidden"
      style={{ background: "var(--divider)", border: "2px solid var(--divider)", borderRadius: "var(--radius-lg)" }}
    >
      {wd.map((w) => (
        <div key={w} className="text-center text-[11px] uppercase font-extrabold py-1.5"
          style={{ background: "var(--surface)", color: "var(--neutral-600)", letterSpacing: ".06em" }}>
          {w}
        </div>
      ))}
      {days.map((d) => {
        const iso = toISODate(d);
        const list = byDay.get(iso) ?? [];
        const inMonth = isSameMonth(d, cursor);
        const isToday = isSameDay(d, today);
        const isSel = iso === selected;
        return (
          <button key={iso}
            onClick={() => (list.length ? onPick(iso) : onSelect(iso))}
            className="min-h-[92px] max-[860px]:min-h-[58px] p-1.5 flex flex-col gap-1 text-left max-[860px]:items-center"
            style={{
              background: "var(--bg)", opacity: inMonth ? 1 : 0.4,
              outline: isSel ? "2px solid var(--accent)" : "none", outlineOffset: "-2px",
            }}
          >
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[6px] text-[13px] font-extrabold"
              style={{
                background: isToday ? "var(--accent)" : "transparent",
                color: isToday ? "var(--bg)" : "var(--ink)",
              }}>
              {d.getDate()}
            </span>
            {/* labels na desktopu */}
            <div className="flex flex-col gap-0.5 min-w-0 max-[860px]:hidden w-full">
              {list.slice(0, 3).map((o) => {
                const t = STATUS_TINT[o.status];
                return (
                  <span key={o.id} className="text-[10px] leading-tight px-1.5 py-[1px] rounded-[4px] truncate"
                    style={{ background: t.bg, color: t.fg, borderLeft: `2px solid ${STATUS_COLOR[o.status]}` }}>
                    {o.vreme_isporuke ? o.vreme_isporuke + " " : ""}{o.kupac_ime}
                  </span>
                );
              })}
              {list.length > 3 && <span className="text-[10px] text-muted">+{list.length - 3} još</span>}
            </div>
            {/* dots na mobilnom */}
            {list.length > 0 && (
              <div className="hidden max-[860px]:flex flex-wrap justify-center gap-1 mt-0.5">
                {list.slice(0, 4).map((o) => (
                  <span key={o.id} className="w-[7px] h-[7px] rounded-full" style={{ background: STATUS_COLOR[o.status] }} />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({ cursor, byDay, onPick }: {
  cursor: Date; byDay: Map<string, Order[]>; onPick: (iso: string) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-7 max-[860px]:grid-cols-1 gap-[2px] overflow-hidden"
      style={{ background: "var(--divider)", border: "2px solid var(--divider)", borderRadius: "var(--radius-lg)" }}>
      {days.map((d) => {
        const iso = toISODate(d);
        const list = byDay.get(iso) ?? [];
        const isToday = isSameDay(d, today);
        return (
          <button key={iso} onClick={() => onPick(iso)}
            className="min-h-[200px] max-[860px]:min-h-0 p-2 flex flex-col gap-1 text-left"
            style={{ background: "var(--bg)" }}>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[11px] uppercase font-extrabold" style={{ color: "var(--neutral-600)" }}>
                {DANI_KRATKO[d.getDay()]}
              </span>
              <span className="text-[18px] font-extrabold" style={{ color: isToday ? "var(--accent)" : "var(--ink)" }}>
                {d.getDate()}
              </span>
            </div>
            {list.map((o) => {
              const t = STATUS_TINT[o.status];
              return (
                <span key={o.id} className="text-[11px] leading-tight px-1.5 py-1 rounded-[5px]"
                  style={{ background: t.bg, color: t.fg, borderLeft: `2px solid ${STATUS_COLOR[o.status]}` }}>
                  {o.vreme_isporuke ? o.vreme_isporuke + " " : ""}{o.kupac_ime}
                </span>
              );
            })}
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
        <h3 className="text-lg capitalize">{danUNedelji(d)}, {d.getDate()}. {MESECI[d.getMonth()]}</h3>
        {orders.length > 0 && <span className="text-sm font-extrabold" style={{ color: "var(--accent)" }}>{formatRSD(prihod)}</span>}
      </div>
      {orders.length === 0 ? (
        <div className="card p-6 text-center text-muted">Nema porudžbina za ovaj dan.</div>
      ) : (
        <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-3">
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}

function nedeljaLabel(cursor: Date): string {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()}. ${MESECI[start.getMonth()]}`;
  return `${start.getDate()}. ${MESECI[start.getMonth()]} – ${end.getDate()}. ${MESECI[end.getMonth()]}`;
}
