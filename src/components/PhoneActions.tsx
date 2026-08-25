"use client";

import { Phone, MessageSquare } from "lucide-react";

// Prikazuje broj telefona sa dve jasne akcije: Pozovi (tel:) i SMS (sms:).
// `variant="inline"` — broj + dva kompaktna dugmeta u redu (zaglavlje kupca);
// `variant="stacked"` — broj iznad, dva puna dugmeta ispod (detalj porudžbine).
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold text-[15px]">{telefon}</span>
        <a href={`tel:${tel}`} className="btn btn-secondary text-sm !py-1.5">
          <Phone size={15} /> Pozovi
        </a>
        <a href={`sms:${tel}`} className="btn btn-secondary text-sm !py-1.5">
          <MessageSquare size={15} /> SMS
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="font-extrabold text-[17px]">{telefon}</div>
      <div className="flex gap-2">
        <a href={`tel:${tel}`} className="btn btn-primary flex-1 justify-center">
          <Phone size={16} /> Pozovi
        </a>
        <a href={`sms:${tel}`} className="btn btn-secondary flex-1 justify-center">
          <MessageSquare size={16} /> SMS
        </a>
      </div>
    </div>
  );
}
