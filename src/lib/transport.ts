// Troškovi prevoza / dostave.
// Polazna tačka: Inđija, Jug Bogdana 17. Sve se računa za POVRATNU vožnju
// (tamo-nazad), jer Ružica vozi do kupca i vraća se.
//
// Ovaj modul je "izomorfan" — koristi se i na serveru (data.ts, pri čuvanju
// porudžbine gde se trošak zaključava) i na klijentu (živi prikaz u formi).

// Podrazumevane vrednosti — poklapaju se sa app_settings u bazi.
// Služe kao fallback kad baza/tabela nije dostupna (da app ne pukne).
export type TransportSettings = {
  dizel_cena_rsd: number; // RSD / litar
  potrosnja_l_100km: number; // l / 100km
  amortizacija_rsd_km: number; // RSD / km (linearna amortizacija vozila)
};

export const DEFAULT_SETTINGS: TransportSettings = {
  dizel_cena_rsd: 234,
  potrosnja_l_100km: 6.5,
  amortizacija_rsd_km: 8,
};

// ── Tabela rastojanja od Inđije (jedan pravac, u km) ──────────────────
// Približne vrednosti; po potrebi doradi. `putarina` je putarina za JEDAN
// pravac (auto, I kategorija) — postoji samo tamo gde se ide autoputem.
// Ključ = normalizovan naziv mesta (mala slova, bez kvačica).
type MestoInfo = { km: number; putarina?: number };

export const RASTOJANJA: Record<string, MestoInfo> = {
  // Inđija i neposredna okolina
  "indjija": { km: 5 },
  "beska": { km: 8 },
  "cortanovci": { km: 12 },
  "maradik": { km: 12 },
  "krcedin": { km: 15 },
  "novi slankamen": { km: 22 },
  "stari slankamen": { km: 26 },

  // Srem
  "stara pazova": { km: 15 },
  "nova pazova": { km: 20 },
  "pazova": { km: 15 },
  "ruma": { km: 25 },
  "irig": { km: 22 },
  "pecinci": { km: 30 },
  "sremska mitrovica": { km: 55 },
  "sremski karlovci": { km: 32 },
  "sid": { km: 85 },
  "sabac": { km: 70 },

  // Beograd i okolina — putarina 100 RSD/smer (kat. I, zvanični kalkulator
  // putevi-srbije.rs, potvrđeno 2026-09-11). Podokolina koristi istu deonicu.
  "beograd": { km: 50, putarina: 100 },
  "zemun": { km: 42, putarina: 100 },
  "novi beograd": { km: 46, putarina: 100 },
  "batajnica": { km: 40, putarina: 100 },
  "surcin": { km: 45, putarina: 100 },
  "zeleznik": { km: 55, putarina: 100 },
  "pancevo": { km: 65, putarina: 100 }, // prolazi kroz Beograd — okvirno

  // Novi Sad i okolina — putarina 240 RSD/smer (kat. I, zvanični kalkulator
  // putevi-srbije.rs, potvrđeno 2026-09-11).
  "novi sad": { km: 40, putarina: 240 },
  "petrovaradin": { km: 42, putarina: 240 },
  "futog": { km: 46, putarina: 240 },
  "veternik": { km: 44, putarina: 240 },
};

// Normalizuje naziv mesta u ključ tabele: mala slova, bez srpskih kvačica.
export function normGrad(grad: string | null | undefined): string {
  return (grad ?? "")
    .trim()
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/\s+/g, " ");
}

// Vraća podatke o mestu iz tabele (jedan pravac) ili null ako ga nema.
export function nadjiMesto(grad: string | null | undefined): MestoInfo | null {
  const key = normGrad(grad);
  return key ? (RASTOJANJA[key] ?? null) : null;
}

// Predložena POVRATNA kilometraža za dati grad (jedan pravac × 2), ili null.
export function predlozenaKm(grad: string | null | undefined): number | null {
  const m = nadjiMesto(grad);
  return m ? m.km * 2 : null;
}

// Putarina za povratnu vožnju za dati grad (jedan pravac × 2), 0 ako nema.
export function predlozenaPutarina(grad: string | null | undefined): number {
  const m = nadjiMesto(grad);
  return m?.putarina ? m.putarina * 2 : 0;
}

// ── Obračun troška prevoza ────────────────────────────────────────────
export type TransportRacun = {
  km: number; // povratna kilometraža
  litara: number; // potrošeno goriva
  gorivo: number; // RSD
  amortizacija: number; // RSD
  putarina: number; // RSD
  ukupno: number; // gorivo + amortizacija + putarina (realni trošak)
  predlog: number; // predložena cena dostave (zaokruženo na 50 RSD)
};

// Zaokruži na najbližih 50 RSD (lepša cena za dogovor sa kupcem).
function zaokruzi50(v: number): number {
  return Math.round(v / 50) * 50;
}

// Glavni obračun. `kmPovratno` je povratna kilometraža; `putarina` je već
// povratna (obe strane). Ako nešto nije poznato, prosledi 0.
export function obracunajTransport(
  kmPovratno: number,
  putarina: number,
  s: TransportSettings
): TransportRacun {
  const km = Math.max(0, kmPovratno || 0);
  const put = Math.max(0, putarina || 0);
  const litara = (km / 100) * s.potrosnja_l_100km;
  const gorivo = litara * s.dizel_cena_rsd;
  const amortizacija = km * s.amortizacija_rsd_km;
  // Amortizacija se trenutno NE prikazuje niti naplaćuje (naš interni trošak).
  // Ostaje izračunata i sačuvana u bazi da je lako vratimo kasnije.
  // Cena i „realan trošak" = gorivo + putarina.
  const ukupno = gorivo + put;
  return {
    km,
    litara: Number(litara.toFixed(2)),
    gorivo: Math.round(gorivo),
    amortizacija: Math.round(amortizacija),
    putarina: Math.round(put),
    ukupno: Math.round(ukupno),
    predlog: zaokruzi50(ukupno),
  };
}
