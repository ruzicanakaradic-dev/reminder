"use client";

import { useState } from "react";
import { MapPin, Copy, Check, Navigation } from "lucide-react";

// Prikazuje adresu isporuke sa akcijama: Apple Maps, Google Maps i „Kopiraj".
// Spaja adresu i grad u jedan upit za navigaciju.
export function AddressActions({
  adresa,
  grad,
}: {
  adresa: string | null | undefined;
  grad: string | null | undefined;
}) {
  const [kopirano, setKopirano] = useState(false);
  const pun = [adresa, grad].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");

  if (!pun) return <span className="text-muted">—</span>;

  const q = encodeURIComponent(pun);
  const apple = `https://maps.apple.com/?q=${q}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${q}`;

  const kopiraj = async () => {
    try {
      await navigator.clipboard.writeText(pun);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 1800);
    } catch {
      // Fallback: stariji uređaji bez clipboard API-ja
      const t = document.createElement("textarea");
      t.value = pun;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); setKopirano(true); setTimeout(() => setKopirano(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(t);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-1.5 font-semibold">
        <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
        <span>{pun}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={apple} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm !py-1.5">
          <Navigation size={14} /> Apple Maps
        </a>
        <a href={google} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm !py-1.5">
          <Navigation size={14} /> Google Maps
        </a>
        <button type="button" onClick={kopiraj} className="btn btn-secondary text-sm !py-1.5">
          {kopirano ? <><Check size={14} /> Kopirano</> : <><Copy size={14} /> Kopiraj</>}
        </button>
      </div>
    </div>
  );
}
