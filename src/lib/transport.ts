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

// Polazna tačka (Inđija, Jug Bogdana 17) — koordinate iz OpenStreetMap-a.
// Koristi se kao ishodište za automatsko računanje vozačke kilometraže
// (OSRM ruta) kad mesto nije u tabeli RASTOJANJA ispod.
export const POLAZISTE = {
  lat: 45.0476342,
  lon: 20.0845384,
  opis: "Inđija, Jug Bogdana 17",
} as const;

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
  // Do Pazova se ide auto-putem (E-75 ka Beogradu) i plaća se ista putarina
  // kao do Beograda — važi za SVE što se vozi auto-putem (potvrđeno iz
  // prakse, 2026-10-07).
  "stara pazova": { km: 15, putarina: 100 },
  "nova pazova": { km: 20, putarina: 100 },
  "pazova": { km: 15, putarina: 100 },
  "ruma": { km: 25 },
  "irig": { km: 22 },
  "pecinci": { km: 30 },
  "sremski karlovci": { km: 32 },

  // Auto-put ka Zagrebu (E-70): do Rume lokalnim putem, pa auto-putem od
  // naplatne stanice Ruma. Putarina kat. I, zvanični kalkulator
  // putevi-srbije.rs (potvrđeno 2026-10-07).
  "sremska mitrovica": { km: 55, putarina: 80 }, // Ruma → Sremska Mitrovica
  "sid": { km: 85, putarina: 320 }, // Ruma → Šid
  // Brzi put Ruma → Šabac (isti ulaz u Rumi), takođe naplatan.
  "sabac": { km: 70, putarina: 150 }, // Ruma → Šabac

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

// Putarina (jedan smer, RSD, kat. I, putevi-srbije.rs) — deonice kroz koje
// se prolazi iz Inđije. E-75: Inđija → Beograd / Novi Sad.
export const PUTARINA_BEOGRAD_SMER = 100;
export const PUTARINA_NOVI_SAD_SMER = 240;
// E-70 (ka Zagrebu), ulaz u Rumi → izlaz (potvrđeno 2026-10-07).
export const PUTARINA_RUMA_SREMSKA_MITROVICA = 80;
export const PUTARINA_RUMA_KUZMIN = 190;
export const PUTARINA_RUMA_SID = 320;
// Brzi put Ruma → Šabac, ulaz u Rumi → izlaz (potvrđeno 2026-10-07).
export const PUTARINA_RUMA_HRTKOVCI = 80;
export const PUTARINA_RUMA_SABAC = 150;

// Procena putarine (JEDAN smer, RSD) za mesto VAN tabele, iz koordinata.
// Inđija je na auto-putu E-75 između Beograda (jug/istok) i Novog Sada (sever).
// Putarina se plaća za sve što se vozi auto-putem:
//  - mesto jugoistočno (pravac Pazova → Batajnica → Beograd, i dalje iza
//    Beograda, npr. Ripanj) → beogradska putarina; zona počinje od Stare
//    Pazove (Banovci, Vojka, Belegiš… se voze preko izlaza za Pazove)
//  - mesto severno iza Novog Sada → bar novosadska putarina
//  - Srem zapadno od Rume (pravac Zagreb) → do Rume lokalno, pa auto-put
//    od Rume do najbližeg izlaza: Sremska Mitrovica / Kuzmin / Šid
//  - jug ka Šapcu → do Rume lokalno, pa brzi put Ruma–Šabac (Hrtkovci / Šabac)
//  - lokalna okolina Inđije (Golubinci, Novi Karlovci, Beška…) i Rume
//    (Voganj, Irig, Vrdnik…) → 0
// Granice su namerno grube; tabela RASTOJANJA ima prednost za poznata mesta.
export function procenaPutarinaSmer(lat: number, lon: number): number {
  if (lat < 45.03 && lon > 20.12) return PUTARINA_BEOGRAD_SMER; // auto-put ka Beogradu
  if (lat > 45.2 && lon < 20.05) return PUTARINA_NOVI_SAD_SMER; // iza Novog Sada
  if (lat > 44.93 && lat < 45.14 && lon < 19.72) {
    // auto-put ka Zagrebu — izlaz po geografskoj dužini (sredina između izlaza)
    if (lon >= 19.51) return PUTARINA_RUMA_SREMSKA_MITROVICA; // Laćarak, Mačvanska Mitrovica…
    if (lon >= 19.32) return PUTARINA_RUMA_KUZMIN; // Martinci, Kuzmin, Erdevik…
    return PUTARINA_RUMA_SID; // Šid, Adaševci, Morović…
  }
  if (lat > 44.6 && lat < 44.93 && lon > 19.55 && lon < 19.85) {
    // brzi put Ruma–Šabac — izlaz po geografskoj širini
    if (lat >= 44.83) return PUTARINA_RUMA_HRTKOVCI; // Hrtkovci, Nikinci…
    return PUTARINA_RUMA_SABAC; // Šabac, Majur, Mišar…
  }
  return 0;
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
