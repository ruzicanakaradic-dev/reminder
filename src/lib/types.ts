export type Status = "u_radu" | "zavrseno" | "isporuceno";

export const STATUS_LABEL: Record<Status, string> = {
  u_radu: "U radu",
  zavrseno: "Završeno",
  isporuceno: "Isporučeno",
};

export const STATUS_ORDER: Status[] = ["u_radu", "zavrseno", "isporuceno"];

export type Customer = {
  id: string;
  redni_broj: number;
  ime: string;
  telefon: string | null;
  napomena: string | null;
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
  proizvod: string;
  opis: string | null;
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
  proizvod: string;
  opis?: string | null;
  tezina_kg?: number | null;
  cena_po_kg?: number | null;
  total?: number | null;
  adresa?: string | null;
  grad?: string | null;
  status: Status;
};
