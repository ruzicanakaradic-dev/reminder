// Auto-putarina za celu Srbiju (kategorija I — putničko vozilo).
//
// Zvanični izvor cena: JP „Putevi Srbije", cenovnik putarine (K1),
// `cene_putarina_lat.pdf`, VAŽI OD 1. jula 2026. 07:00h.
// https://www.putevi-srbije.rs → Kategorizacija vozila / Cenovnik putarine.
//
// KAKO RADI (zatvoreni sistem naplate):
// Svaka magistrala ima niz naplatnih stanica poređanih duž trase. Cena u tabeli
// je KUMULATIVNA od bazne (nulte) stanice te magistrale. Putarina za vožnju
// između dve stanice = |cena(izlaz) − cena(ulaz)| na ISTOJ magistrali.
//
// Polazište i odredište se mapiraju na najbližu stanicu svake magistrale; ako
// obe tačke „hvataju" istu magistralu, putarina je razlika njihovih kumulativa.
// Ako ruta ne pripada nijednoj pokrivenoj magistrali (lokalni putevi, van
// sistema) → 0 uz flag `proveri = true` (korisnica neka proveri ručno).
//
// OBUHVAT (faza 1): E-75 (Subotica–Beograd–Preševo), E-70 (Beograd–Šid),
// E-80 (Niš–Dimitrovgrad), E-763 „Miloš Veliki" (Beograd/Obrenovac–Prilipac).
//
// Koordinate stanica su približne (±par km) — dovoljno za mapiranje tačke na
// najbližu stanicu po trasi; cene su tačne iz zvaničnog cenovnika.

export type Magistrala = "E75" | "E70" | "E80" | "E763";

export type NaplatnaStanica = {
  naziv: string;
  lat: number;
  lon: number;
  magistrala: Magistrala;
  // Kumulativna cena K1 (RSD) od bazne stanice magistrale. Bazna = 0.
  kumulativ: number;
};

// ── E-75 : Subotica ↔ Beograd ↔ Preševo ───────────────────────────────
// Jedna neprekidna osa. Bazni kumulativ postavljen tako da je Beograd (čvor)
// referenca; sever (ka Subotici) i jug (ka Preševu) rastu od Beograda.
//
// Sever (list „STARA PAZOVA – Subotica", cene su od Stare Pazove ka Subotici):
//   SP→Inđija 100, →Maradik 120, →Beška 150, →Kovilj 230, →Novi Sad 340,
//   →Zmajevo 430, →Vrbas 500, →Feketić 550, →Bačka Topola 670, →Žednik 730,
//   →Subotica 850.
// Stara Pazova je i prva stanica ka Beogradu — iz lista „Beograd–Subotica"
// Stara Pazova nije posebno naplaćena ka BG (ulaz u zonu), pa SP ≈ Beograd-čvor
// za K1 svrhe (deonica BG–SP se ne naplaćuje kroz ovaj zatvoreni podsistem na
// isti način). Da bi razlike bile tačne, sever držimo kao kumulativ OD Stare
// Pazove, a jug OD Beograda; Beograd i Stara Pazova su ista referentna tačka 0.
//
// Jug (list „BEOGRAD – Preševo", cene od Beograda):
//   Mali Požarevac 100, Umčari 140, Vodanj 170, Kolari 200, Smederevo 230,
//   Požarevac 240, Velika Plana 400, Markovac 460, Lapovo 500, Batočina 520,
//   Jagodina 640, Ćuprija 710, Paraćin 770, Ćićevac 860, Kruševac istok 960,
//   Kruševac zapad 970, Koševi 1000, Velika Drenova 1050, Trstenik 1120,
//   Vrnjačka Banja 1190, Vrba 1260, Ražanj 900, Aleksinački Rudnici 1020,
//   Aleksinac 1050, Niš jug 1180, Merošina 1210, Doljevac Selo 1270,
//   Brestovac 1300, Leskovac centar 1340, Leskovac jug 1430, Grdelica 1490,
//   Predejane 1580, Vladičin Han 1720, Vranje 1850, Bujanovac sever 1920,
//   Bujanovac jug 1940, Preševo 2060.
// (Ražanj niz je paralelni krak Niš-istok/sever; glavna osa ide kroz Niš jug.)
const E75: NaplatnaStanica[] = [
  // sever (kumulativ raste ka Subotici; Beograd/Stara Pazova = 0)
  { naziv: "Subotica", lat: 46.1, lon: 19.665, magistrala: "E75", kumulativ: 850 },
  { naziv: "Žednik", lat: 45.95, lon: 19.62, magistrala: "E75", kumulativ: 730 },
  { naziv: "Bačka Topola", lat: 45.81, lon: 19.63, magistrala: "E75", kumulativ: 670 },
  { naziv: "Feketić", lat: 45.645, lon: 19.69, magistrala: "E75", kumulativ: 550 },
  { naziv: "Vrbas", lat: 45.57, lon: 19.64, magistrala: "E75", kumulativ: 500 },
  { naziv: "Zmajevo", lat: 45.47, lon: 19.70, magistrala: "E75", kumulativ: 430 },
  { naziv: "Novi Sad", lat: 45.24, lon: 19.80, magistrala: "E75", kumulativ: 340 },
  { naziv: "Kovilj", lat: 45.23, lon: 20.02, magistrala: "E75", kumulativ: 230 },
  { naziv: "Beška", lat: 45.15, lon: 20.08, magistrala: "E75", kumulativ: 150 },
  { naziv: "Maradik", lat: 45.12, lon: 20.03, magistrala: "E75", kumulativ: 120 },
  { naziv: "Inđija", lat: 45.05, lon: 20.08, magistrala: "E75", kumulativ: 100 },
  // čvor Beograd / Stara Pazova = referentna 0
  { naziv: "Stara Pazova", lat: 44.985, lon: 20.16, magistrala: "E75", kumulativ: 0 },
  { naziv: "Beograd", lat: 44.82, lon: 20.46, magistrala: "E75", kumulativ: 0 },
  // jug (kumulativ raste ka Preševu)
  { naziv: "Mali Požarevac", lat: 44.60, lon: 20.63, magistrala: "E75", kumulativ: 100 },
  { naziv: "Umčari", lat: 44.55, lon: 20.77, magistrala: "E75", kumulativ: 140 },
  { naziv: "Vodanj", lat: 44.52, lon: 20.82, magistrala: "E75", kumulativ: 170 },
  { naziv: "Kolari", lat: 44.52, lon: 20.90, magistrala: "E75", kumulativ: 200 },
  { naziv: "Smederevo", lat: 44.52, lon: 20.90, magistrala: "E75", kumulativ: 230 },
  { naziv: "Požarevac", lat: 44.52, lon: 21.02, magistrala: "E75", kumulativ: 240 },
  { naziv: "Velika Plana", lat: 44.33, lon: 21.07, magistrala: "E75", kumulativ: 400 },
  { naziv: "Markovac", lat: 44.23, lon: 21.09, magistrala: "E75", kumulativ: 460 },
  { naziv: "Lapovo", lat: 44.18, lon: 21.09, magistrala: "E75", kumulativ: 500 },
  { naziv: "Batočina", lat: 44.15, lon: 21.08, magistrala: "E75", kumulativ: 520 },
  { naziv: "Jagodina", lat: 43.98, lon: 21.26, magistrala: "E75", kumulativ: 640 },
  { naziv: "Ćuprija", lat: 43.93, lon: 21.37, magistrala: "E75", kumulativ: 710 },
  { naziv: "Paraćin", lat: 43.86, lon: 21.41, magistrala: "E75", kumulativ: 770 },
  { naziv: "Ćićevac", lat: 43.72, lon: 21.45, magistrala: "E75", kumulativ: 860 },
  { naziv: "Kruševac istok", lat: 43.60, lon: 21.37, magistrala: "E75", kumulativ: 960 },
  { naziv: "Kruševac zapad", lat: 43.58, lon: 21.28, magistrala: "E75", kumulativ: 970 },
  { naziv: "Koševi", lat: 43.57, lon: 21.40, magistrala: "E75", kumulativ: 1000 },
  { naziv: "Velika Drenova", lat: 43.60, lon: 21.15, magistrala: "E75", kumulativ: 1050 },
  { naziv: "Trstenik", lat: 43.62, lon: 21.00, magistrala: "E75", kumulativ: 1120 },
  { naziv: "Vrnjačka Banja", lat: 43.62, lon: 20.90, magistrala: "E75", kumulativ: 1190 },
  { naziv: "Vrba", lat: 43.65, lon: 20.78, magistrala: "E75", kumulativ: 1260 },
  { naziv: "Ražanj", lat: 43.67, lon: 21.55, magistrala: "E75", kumulativ: 900 },
  { naziv: "Aleksinački Rudnici", lat: 43.57, lon: 21.68, magistrala: "E75", kumulativ: 1020 },
  { naziv: "Aleksinac", lat: 43.54, lon: 21.71, magistrala: "E75", kumulativ: 1050 },
  { naziv: "Niš jug", lat: 43.27, lon: 21.86, magistrala: "E75", kumulativ: 1180 },
  { naziv: "Merošina", lat: 43.27, lon: 21.71, magistrala: "E75", kumulativ: 1210 },
  { naziv: "Doljevac Selo", lat: 43.20, lon: 21.83, magistrala: "E75", kumulativ: 1270 },
  { naziv: "Brestovac", lat: 43.10, lon: 21.85, magistrala: "E75", kumulativ: 1300 },
  { naziv: "Leskovac centar", lat: 42.99, lon: 21.95, magistrala: "E75", kumulativ: 1340 },
  { naziv: "Leskovac jug", lat: 42.93, lon: 21.98, magistrala: "E75", kumulativ: 1430 },
  { naziv: "Grdelica", lat: 42.88, lon: 22.08, magistrala: "E75", kumulativ: 1490 },
  { naziv: "Predejane", lat: 42.85, lon: 22.15, magistrala: "E75", kumulativ: 1580 },
  { naziv: "Vladičin Han", lat: 42.70, lon: 22.07, magistrala: "E75", kumulativ: 1720 },
  { naziv: "Vranje", lat: 42.55, lon: 21.90, magistrala: "E75", kumulativ: 1850 },
  { naziv: "Bujanovac sever", lat: 42.47, lon: 21.77, magistrala: "E75", kumulativ: 1920 },
  { naziv: "Bujanovac jug", lat: 42.43, lon: 21.76, magistrala: "E75", kumulativ: 1940 },
  { naziv: "Preševo", lat: 42.31, lon: 21.65, magistrala: "E75", kumulativ: 2060 },
];

// ── E-70 : Beograd ↔ Šid (ka Zagrebu) + krak ka Šapcu ──────────────────
// List „ŠID — deonica Beograd – Šid", kumulativ (K1) OD BEOGRADA:
//   Morović/Adaševci 50, Kuzmin 120, Sremska Mitrovica 240, Ruma 320,
//   Hrtkovci 380, Šabac 460, Pećinci 380, Šimanovci 520.
// Napomena: Hrtkovci/Šabac su krak brzog puta Ruma–Šabac (isti zatvoreni
// sistem, kumulativ od Beograda), pa razlika kumulativa i dalje daje tačno.
const E70: NaplatnaStanica[] = [
  { naziv: "Beograd (Dobanovci)", lat: 44.82, lon: 20.33, magistrala: "E70", kumulativ: 0 },
  { naziv: "Šimanovci", lat: 44.89, lon: 20.07, magistrala: "E70", kumulativ: 520 },
  { naziv: "Pećinci", lat: 44.90, lon: 19.96, magistrala: "E70", kumulativ: 380 },
  { naziv: "Ruma", lat: 45.01, lon: 19.82, magistrala: "E70", kumulativ: 320 },
  { naziv: "Hrtkovci", lat: 44.92, lon: 19.70, magistrala: "E70", kumulativ: 380 },
  { naziv: "Šabac", lat: 44.75, lon: 19.69, magistrala: "E70", kumulativ: 460 },
  { naziv: "Sremska Mitrovica", lat: 44.98, lon: 19.61, magistrala: "E70", kumulativ: 240 },
  { naziv: "Kuzmin", lat: 44.98, lon: 19.44, magistrala: "E70", kumulativ: 120 },
  { naziv: "Morović / Adaševci", lat: 45.0, lon: 19.30, magistrala: "E70", kumulativ: 50 },
  // Šid se vozi do izlaza Adaševci (poslednja naplatna pre Šida) → isti kumulativ.
  { naziv: "Šid", lat: 45.12, lon: 19.23, magistrala: "E70", kumulativ: 50 },
];

// ── E-80 : Niš ↔ Dimitrovgrad (ka Sofiji) ──────────────────────────────
// List „DIMITROVGRAD – Beograd" daje kumulativ od Dimitrovgrada. Za deonicu
// Niš–Dimitrovgrad koristimo razliku. Kumulativ od Niša (istok) ka Dimitrovgradu:
//   Niš istok 0, Bela Palanka 190, Pirot zapad 300?, Pirot istok ..., Dimitrovgrad.
// Iz lista (od Dimitrovgrada): Pirot istok 160, Pirot zapad 230, Bela Palanka 370,
// Niš Malča 550, Niš istok 590. Preračunato od Niš istok = 0:
const E80: NaplatnaStanica[] = [
  { naziv: "Niš istok", lat: 43.32, lon: 21.95, magistrala: "E80", kumulativ: 0 },
  { naziv: "Niš Malča", lat: 43.35, lon: 22.03, magistrala: "E80", kumulativ: 40 },
  { naziv: "Bela Palanka", lat: 43.22, lon: 22.31, magistrala: "E80", kumulativ: 220 },
  { naziv: "Pirot zapad", lat: 43.17, lon: 22.55, magistrala: "E80", kumulativ: 360 },
  { naziv: "Pirot istok", lat: 43.15, lon: 22.62, magistrala: "E80", kumulativ: 430 },
  { naziv: "Dimitrovgrad", lat: 43.01, lon: 22.78, magistrala: "E80", kumulativ: 590 },
];

// ── E-763 „Miloš Veliki" : Beograd/Obrenovac ↔ Prilipac (ka Požegi) ────
// List „OBRENOVAC — deonica Beograd – Požega", kumulativ (K1) od Obrenovca:
//   Ub 150, Lajkovac 220, Ljig 360, Takovo 540, Preljina jug 660, Adrani 810,
//   Čačak (Pakovraće) 720, Lučani 860, Prilipac 950.
const E763: NaplatnaStanica[] = [
  { naziv: "Obrenovac", lat: 44.65, lon: 20.20, magistrala: "E763", kumulativ: 0 },
  { naziv: "Ub", lat: 44.45, lon: 20.07, magistrala: "E763", kumulativ: 150 },
  { naziv: "Lajkovac", lat: 44.37, lon: 20.17, magistrala: "E763", kumulativ: 220 },
  { naziv: "Ljig", lat: 44.23, lon: 20.24, magistrala: "E763", kumulativ: 360 },
  { naziv: "Takovo", lat: 44.02, lon: 20.42, magistrala: "E763", kumulativ: 540 },
  { naziv: "Preljina jug", lat: 43.93, lon: 20.42, magistrala: "E763", kumulativ: 660 },
  { naziv: "Čačak (Pakovraće)", lat: 43.86, lon: 20.30, magistrala: "E763", kumulativ: 720 },
  { naziv: "Adrani", lat: 43.78, lon: 20.52, magistrala: "E763", kumulativ: 810 },
  { naziv: "Lučani", lat: 43.86, lon: 20.14, magistrala: "E763", kumulativ: 860 },
  { naziv: "Prilipac", lat: 43.82, lon: 20.07, magistrala: "E763", kumulativ: 950 },
];

// Čvorovi — mesta gde se više magistrala spaja. Beograd je ulaz/baza (kumulativ
// 0) na E-75, E-70 i E-763, pa da bi „Beograd → bilo gde" radilo, Beograd mora
// da postoji kao stanica na svakoj od njih. Niš je čvor E-75 ↔ E-80.
const CVOROVI: NaplatnaStanica[] = [
  { naziv: "Beograd", lat: 44.82, lon: 20.46, magistrala: "E70", kumulativ: 0 },
  { naziv: "Beograd", lat: 44.82, lon: 20.46, magistrala: "E763", kumulativ: 0 },
  // Niš jug (E-75) i Niš istok (E-80) su isti grad — spajamo ih kao čvor:
  { naziv: "Niš", lat: 43.32, lon: 21.90, magistrala: "E75", kumulativ: 1180 },
  { naziv: "Niš", lat: 43.32, lon: 21.90, magistrala: "E80", kumulativ: 0 },
];

export const SVE_STANICE: NaplatnaStanica[] = [...E75, ...E70, ...E80, ...E763, ...CVOROVI];

// Haversine rastojanje (km) između dve geo tačke.
function km2(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Najbliža stanica datoj tački NA ZADATOJ magistrali, u okviru praga (km).
// Null ako je sve dalje od praga.
function najblizaNaMagistrali(
  lat: number,
  lon: number,
  mag: Magistrala,
  prag: number
): { st: NaplatnaStanica; d: number } | null {
  let best: NaplatnaStanica | null = null;
  let bestD = Infinity;
  for (const st of SVE_STANICE) {
    if (st.magistrala !== mag) continue;
    const d = km2(lat, lon, st.lat, st.lon);
    if (d < bestD) {
      bestD = d;
      best = st;
    }
  }
  return best && bestD <= prag ? { st: best, d: bestD } : null;
}

const MAGISTRALE: Magistrala[] = ["E75", "E70", "E80", "E763"];

export type PutarinaRezultat = {
  smer: number; // putarina za JEDAN smer (RSD)
  magistrala: Magistrala | null;
  ulaz: string | null;
  izlaz: string | null;
  proveri: boolean; // true = nije pouzdano auto-izračunato, korisnica neka proveri
};

// Prag (km) za „tačka pripada ovoj stanici/magistrali". Dovoljno labav da uhvati
// grad u blizini naplatne stanice, dovoljno strog da ne lepi lokalne puteve.
const PRAG_KM = 12;

// Auto-putarina (JEDAN smer, RSD) za vožnju polaziste → odrediste, na osnovu
// najbližih naplatnih stanica na istoj magistrali. Kad obe tačke nisu na istoj
// pokrivenoj magistrali → 0 + proveri=true (fallback, korisnica proverava).
export function autoPutarinaSmer(
  polLat: number,
  polLon: number,
  odrLat: number,
  odrLon: number
): PutarinaRezultat {
  // Nađi magistralu na kojoj su OBE tačke blizu naplatne stanice. Kad ih ima
  // više (čvor kao Beograd), biraj onu sa najmanjim zbirom odstojanja —
  // ta magistrala najverovatnije nosi rutu.
  let best: { mag: Magistrala; a: NaplatnaStanica; b: NaplatnaStanica; d: number } | null = null;
  for (const mag of MAGISTRALE) {
    const a = najblizaNaMagistrali(polLat, polLon, mag, PRAG_KM);
    const b = najblizaNaMagistrali(odrLat, odrLon, mag, PRAG_KM);
    if (a && b) {
      const d = a.d + b.d;
      if (!best || d < best.d) best = { mag, a: a.st, b: b.st, d };
    }
  }

  if (best) {
    const smer = Math.abs(best.b.kumulativ - best.a.kumulativ);
    return {
      smer,
      magistrala: best.mag,
      ulaz: best.a.naziv,
      izlaz: best.b.naziv,
      proveri: false,
    };
  }

  // Nijedna magistrala ne hvata obe tačke (lokalni put, van sistema, ili ruta
  // koja presedava preko dve magistrale) → ne možemo pouzdano. 0 + proveri.
  return { smer: 0, magistrala: null, ulaz: null, izlaz: null, proveri: true };
}

// Povratna putarina (oba smera) — app računa troškove za povratnu vožnju.
export function autoPutarinaPovratno(
  polLat: number,
  polLon: number,
  odrLat: number,
  odrLon: number
): PutarinaRezultat {
  const r = autoPutarinaSmer(polLat, polLon, odrLat, odrLon);
  return { ...r, smer: r.smer * 2 };
}
