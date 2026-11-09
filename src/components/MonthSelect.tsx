"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
  const items = Object.fromEntries(options.map((o) => [o.key, o.label]));
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(v) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("mesec", String(v));
        router.push(`${pathname}?${sp.toString()}`);
      }}
    >
      <SelectTrigger className="w-auto min-w-[9.5rem] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
