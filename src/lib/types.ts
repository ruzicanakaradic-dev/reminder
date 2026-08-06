export type Status = "primljena" | "u_radu" | "zavrseno" | "isporuceno";

export const STATUS_LABEL: Record<Status, string> = {
  primljena: "Primljena",
  u_radu: "U radu",
  zavrseno: "Završena",
  isporuceno: "Isporučena",
};

export const STATUS_ORDER: Status[] = ["primljena", "u_radu", "zavrseno", "isporuceno"];

// jedinstveni ID kupca: RK-000N
export function customerCode(redniBroj: number): string {
  return `RK-${String(redniBroj).padStart(4, "0")}`;
}

export type Customer = {
  id: string;
  redni_broj: number;
  ime: string;
  telefon: string | null;
  napomena: string | null;
  grad: string | null;
  adresa: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  redni_broj: number;
  customer_id: string | null;
  kupac_ime: string;
  kupac_telefon: string | null;
  datum_porudzbine: string; // YYYY-MM-DD
  datum_isporuke: string; // YYYY-MM-DD
  vreme_isporuke: string | null; // HH:MM
  proizvod: string;
  opis: string | null;
  napomena: string | null; // posebna želja / napomena
  slika: string | null; // data URL slike primera
  tezina_kg: number | null;
  cena_po_kg: number | null;
  total: number | null;
  adresa: string | null;
  grad: string | null;
  status: Status;
  reminded_2d: boolean;
  reminded_1d: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderInput = {
  id?: string;
  kupac_ime: string;
  kupac_telefon?: string | null;
  datum_porudzbine: string;
  datum_isporuke: string;
  vreme_isporuke?: string | null;
  proizvod: string;
  opis?: string | null;
  napomena?: string | null;
  slika?: string | null;
  tezina_kg?: number | null;
  cena_po_kg?: number | null;
  total?: number | null;
  adresa?: string | null;
  grad?: string | null;
  status: Status;
};
