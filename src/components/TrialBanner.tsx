"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getTrialStatusAction } from "@/app/actions";

// Tanki baner probnog perioda (faza 4). Vidljiv samo korisnicama na trial-u;
// paid nalog (Ružica) ga ne vidi. Samo informacija o preostalim danima.
export function TrialBanner() {
  const [st, setSt] = useState<{ trial: boolean; danaLeft: number; istice_danas: boolean } | null>(null);

  useEffect(() => {
    getTrialStatusAction()
      .then(setSt)
      .catch(() => {});
  }, []);

  if (!st || !st.trial) return null;

  const tekst = st.istice_danas
    ? "Probni period ističe danas"
    : `Probni period — još ${st.danaLeft} ${st.danaLeft === 1 ? "dan" : "dana"}`;

  return (
    <div
      className="flex items-center gap-2 text-sm font-semibold rounded-[12px] px-3.5 py-2.5 mb-4"
      style={{
        background: "var(--accent-100)",
        color: "var(--brand-plum)",
        border: "1px solid var(--accent-300)",
      }}
    >
      <Clock size={16} className="shrink-0" />
      <span>{tekst}</span>
    </div>
  );
}
