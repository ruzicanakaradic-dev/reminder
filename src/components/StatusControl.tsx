"use client";

import { useState, useTransition } from "react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/types";
import { setStatusAction } from "@/app/actions";

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
      className="inline-flex rounded-full bg-sand p-1 gap-1"
      style={{ opacity: pending ? 0.7 : 1 }}
    >
      {STATUS_ORDER.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            onClick={() => change(s)}
            className={`rounded-full font-semibold transition-all ${
              size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3.5 py-1.5"
            }`}
            style={{
              background: active ? "#fff" : "transparent",
              color: active ? `var(--${s.replace("_", "-")})` : "var(--muted)",
              boxShadow: active ? "0 1px 4px rgba(61,43,52,.12)" : "none",
            }}
          >
            {STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
