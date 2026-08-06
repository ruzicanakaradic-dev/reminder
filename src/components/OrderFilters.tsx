"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (q) p.set("q", q);
      else p.delete("q");
      router.replace(`${pathname}?${p.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setStatus = (s: string) => {
    const p = new URLSearchParams(params.toString());
    if (s) p.set("status", s);
    else p.delete("status");
    router.replace(`${pathname}?${p.toString()}`);
  };

  const tabs = [{ key: "", label: "Sve" }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s] }))];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input pl-11"
          placeholder="Pretraži po kupcu, proizvodu, gradu…"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {tabs.map((t) => {
          const active = status === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`tag shrink-0 ${active ? "tag-active" : ""}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
