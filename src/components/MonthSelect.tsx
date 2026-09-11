"use client";

import { useRouter } from "next/navigation";

// Padajući izbor meseca za statistiku prevoza. Menja ?mesec=YYYY-MM u URL-u,
// server komponenta pročita parametar i preračuna za izabrani mesec.
export function MonthSelect({
  value,
  options,
}: {
  value: string;
  options: { key: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <select
      className="select !w-auto text-sm"
      value={value}
      onChange={(e) => router.push(`/statistika?mesec=${e.target.value}`)}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
