"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Padajući izbor meseca za statistiku prevoza. Menja ?mesec=YYYY-MM u URL-u
// (čuva ostale parametre, npr. ?period); server komponenta pročita parametar
// i preračuna za izabrani mesec.
export function MonthSelect({
  value,
  options,
}: {
  value: string;
  options: { key: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      className="select !w-auto text-sm"
      value={value}
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("mesec", e.target.value);
        router.push(`${pathname}?${sp.toString()}`);
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
