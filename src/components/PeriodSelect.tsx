"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Izbor perioda za statistiku prodaje: poslednjih 6/12/24/36 meseci ili sve.
// Menja ?period=N u URL-u (čuva ostale parametre, npr. ?mesec).
export function PeriodSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (p: string) => {
    const sp = new URLSearchParams(params.toString());
    if (p === "sve") sp.delete("period");
    else sp.set("period", p);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const opts = [
    { key: "6", label: "6m" },
    { key: "12", label: "12m" },
    { key: "24", label: "24m" },
    { key: "36", label: "36m" },
    { key: "sve", label: "Sve" },
  ];

  return (
    <div className="seg max-[520px]:w-full">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => set(o.key)}
          className={`seg-opt max-[520px]:flex-1 ${value === o.key ? "active" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
