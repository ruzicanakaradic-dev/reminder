"use client";

import { Phone, MessageSquare } from "lucide-react";

// Prikazuje broj telefona sa dve akcije: pozovi (tel:) i pošalji SMS (sms:).
// `variant="inline"` — kompaktan red (za zaglavlje kupca);
// `variant="stacked"` — broj + dva dugmeta ispod (za detalj porudžbine).
export function PhoneActions({
  telefon,
  variant = "stacked",
}: {
  telefon: string | null | undefined;
  variant?: "inline" | "stacked";
}) {
  if (!telefon) return <span className="text-muted">—</span>;
  const tel = telefon.replace(/\s+/g, "");

  if (variant === "inline") {
    return (
      <span className="flex items-center gap-2">
        <a href={`tel:${tel}`} className="flex items-center gap-1 font-bold" style={{ color: "var(--accent)" }}>
          <Phone size={14} /> {telefon}
        </a>
        <a
          href={`sms:${tel}`}
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--accent)" }}
          aria-label="Pošalji SMS"
        >
          <MessageSquare size={13} /> SMS
        </a>
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="font-bold" style={{ color: "var(--accent)" }}>{telefon}</div>
      <div className="flex gap-2">
        <a href={`tel:${tel}`} className="btn btn-secondary text-sm !py-1.5 flex-1 justify-center">
          <Phone size={15} /> Pozovi
        </a>
        <a href={`sms:${tel}`} className="btn btn-secondary text-sm !py-1.5 flex-1 justify-center">
          <MessageSquare size={15} /> SMS
        </a>
      </div>
    </div>
  );
}
