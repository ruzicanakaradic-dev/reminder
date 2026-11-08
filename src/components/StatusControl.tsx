"use client";

import { useState, useTransition } from "react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/types";
import { setStatusAction } from "@/app/actions";
import { razumljivaPoruka } from "@/lib/greske";

// Boje aktivnog pila idu preko CSS varijabli da prate temu (svetlo/tamno).
const ACTIVE: Record<Status, { bg: string; fg: string }> = {
  primljena: { bg: "var(--stp-primljena-bg)", fg: "var(--stp-primljena-fg)" },
  u_radu: { bg: "var(--stp-u_radu-bg)", fg: "var(--stp-u_radu-fg)" },
  zavrseno: { bg: "var(--stp-zavrseno-bg)", fg: "var(--stp-zavrseno-fg)" },
  isporuceno: { bg: "var(--stp-isporuceno-bg)", fg: "var(--stp-isporuceno-fg)" },
};

export function StatusControl({
  id,
  status,
  size = "md",
}: {
  id: string;
  status: Status;
  size?: "sm" | "md";
}) {
  const [current, setCurrent] = useState<Status>(status);
  const [pending, start] = useTransition();

  const change = (s: Status) => {
    if (s === current || pending) return;
    const prev = current;
    setCurrent(s);
    start(async () => {
      let greska: string | null = null;
      try {
        const res = await setStatusAction(id, s);
        if (!res.ok) greska = res.greska;
      } catch (err) {
        greska = razumljivaPoruka(err);
      }
      if (greska) {
        setCurrent(prev);
        alert(`Status nije promenjen. ${greska}`);
      }
    });
  };

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-[10px] border border-[var(--divider)] bg-[var(--bg)] p-1"
      style={{ opacity: pending ? 0.7 : 1 }}
    >
      {STATUS_ORDER.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            onClick={() => change(s)}
            className={`rounded-[6px] font-extrabold transition-all ${
              size === "sm" ? "text-[11px] px-2 py-1" : "text-[13px] px-3 py-1.5"
            }`}
            style={{
              background: active ? ACTIVE[s].bg : "transparent",
              color: active ? ACTIVE[s].fg : "var(--neutral-700)",
            }}
          >
            {STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
