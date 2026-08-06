"use client";

import { useState, useTransition } from "react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/types";
import { setStatusAction } from "@/app/actions";

const ACTIVE: Record<Status, { bg: string; fg: string }> = {
  primljena: { bg: "#9a8fa0", fg: "#fff" },
  u_radu: { bg: "#7a3785", fg: "#f7ecd4" },
  zavrseno: { bg: "#977128", fg: "#f7ecd4" },
  isporuceno: { bg: "#34233b", fg: "#f7ecd4" },
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
      try {
        await setStatusAction(id, s);
      } catch {
        setCurrent(prev);
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
