// Formatiranje brojeva i datuma na srpskom (sr-RS)

export function formatRSD(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKg(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return `${new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 }).format(value)} kg`;
}

export function formatNum(value: number | null | undefined, frac = 2): string {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: frac }).format(value);
}

const MESECI = [
  "januar", "februar", "mart", "april", "maj", "jun",
  "jul", "avgust", "septembar", "oktobar", "novembar", "decembar",
];
const DANI = ["nedelja", "ponedeljak", "utorak", "sreda", "četvrtak", "petak", "subota"];
const DANI_KRATKO = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"];

// Parsira "YYYY-MM-DD" kao lokalni datum (bez pomeranja zbog vremenske zone)
export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDatum(d: string | Date): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return `${date.getDate()}. ${MESECI[date.getMonth()]} ${date.getFullYear()}.`;
}

export function formatDatumKratko(d: string | Date): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}.`;
}

export function danUNedelji(d: string | Date, kratko = false): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return kratko ? DANI_KRATKO[date.getDay()] : DANI[date.getDay()];
}

export { MESECI, DANI, DANI_KRATKO };

// Koliko dana do isporuke (0 = danas, negativno = prošlo)
export function danaDo(datumIsporuke: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseDate(datumIsporuke);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function relativnoDana(dana: number): string {
  if (dana === 0) return "danas";
  if (dana === 1) return "sutra";
  if (dana === 2) return "za 2 dana";
  if (dana === -1) return "juče";
  if (dana < 0) return `pre ${Math.abs(dana)} dana`;
  return `za ${dana} dana`;
}
