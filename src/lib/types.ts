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

// Izmena postojećeg kupca (ispravka greške u unosu)
export type CustomerInput = {
  id: string;
  ime: string;
  telefon?: string | null;
  grad?: string | null;
  adresa?: string | null;
  napomena?: string | null;
  // Primeni ispravljeni grad i adresu i na sve ranije porudžbine ovog kupca.
  // Isključiti ako su pojedine porudžbine imale namerno različite adrese.
  primeni_adresu_na_porudzbine?: boolean;
};

export type OrderItem = {
  id: string;
  order_id: string;
  redosled: number;
  naziv: string;
  tezina_kg: number | null;
  cena_po_kg: number | null;
  total: number | null;
};

// Ono što stiže iz forme (bez id/order_id) za svaku stavku
export type OrderItemInput = {
  naziv: string;
  tezina_kg?: number | null;
  cena_po_kg?: number | null;
  total?: number | null;
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
  total: number | null; // zbir proizvoda (kolači/torte) — BEZ dekoracije i dostave; ukupno → ukupnaCena()
  adresa: string | null;
  grad: string | null;
  dekoracija_cena: number | null; // cena dekoracije/topera (RSD) — ulazi u ukupnu cenu; kupac je plaća, pa nije ni trošak ni zarada
  // Lično preuzimanje: kupac preuzima kod nas, nema dostave ni troška prevoza
  licno_preuzimanje: boolean;
  // Transport / dostava (snapshot troška u trenutku čuvanja)
  transport_km: number | null; // povratna kilometraža
  transport_litara: number | null; // potrošeno goriva (l)
  transport_gorivo: number | null; // trošak goriva (RSD)
  transport_amortizacija: number | null; // amortizacija vozila (RSD)
  transport_putarina: number | null; // putarina (RSD)
  transport_predlog: number | null; // predložena cena dostave (RSD)
  transport_cena: number | null; // naplaćena cena dostave (RSD)
  status: Status;
  reminded_2d: boolean;
  reminded_1d: boolean;
  reminded_0d: boolean;
  reminded_2h: boolean;
  created_at: string;
  updated_at: string;
  items?: OrderItem[]; // stavke (vrste kolača) — popunjeno u getOrder
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
  dekoracija_cena?: number | null; // ručno upisana cena dekoracije/topera (RSD)
  licno_preuzimanje?: boolean; // kupac preuzima kod nas → bez dostave i troška prevoza
  // Transport: ako je prazno, izvodi se iz grada (tabela rastojanja).
  transport_km?: number | null; // povratna kilometraža (ručni unos ili auto)
  transport_putarina?: number | null; // povratna putarina (procena sa mape kad grad nije u tabeli)
  transport_cena?: number | null; // naplaćena cena dostave (ručni unos ili = predlog)
  status: Status;
  items?: OrderItemInput[]; // više vrsta kolača u jednoj porudžbini
};

// Tip goriva — utiče samo na labelu i koju cenu korisnica unosi; obračun je
// identičan (cena/litar × potrošnja), gorivo je neutralno u formulama.
export type TipGoriva = "dizel" | "benzin";

// Podešavanja po korisnici (tabela app_settings, jedan red po poslastičarki).
// Polja koja su ranije bila zakucana za Ružicu (polazište, prag besplatne
// dostave) ovde su podesiva za svaku korisnicu.
export type AppSettings = {
  // Polazište za kilometražu i auto-putarinu (ranije zakucano: Inđija).
  polaziste_adresa: string; // npr. "Inđija, Jug Bogdana 17"
  polaziste_lat: number; // 0 = nije geokodirano
  polaziste_lon: number; // 0 = nije geokodirano
  // Gorivo — tip je informativan, cena ulazi u obračun.
  tip_goriva: TipGoriva;
  gorivo_cena_rsd: number; // RSD / litar
  potrosnja_l_100km: number; // l / 100km
  amortizacija_rsd_km: number; // RSD / km (interni trošak, ne naplaćuje se)
  // Prag besplatne dostave (RSD, gleda se na zbir torti/kolača); 0 = nema.
  besplatna_dostava_od: number;
  // Brend KORISNICE (nivo 2) — njen logo i boja, nezavisno od Trust identiteta.
  naziv_biznisa: string;
  brend_boja: string; // hex; prazno = podrazumevana (Trust plum)
  brend_logo: string; // ime fajla u PB (prazno = koristi inicijal)
};

// Boja + naziv + logo URL brenda korisnice, za primenu u radnom prostoru.
export type BrendKorisnice = {
  naziv: string;
  boja: string | null;
  logoUrl: string | null;
};

// ── Admin konzola (SaaS upravljanje korisnicama) ───────────────────
// Plan korisnice: free (trial) ili paid (plaćena pretplata).
export type Plan = "free" | "paid";

// Red u admin pregledu — jedna poslastičarka (nalog u `users`) sa statusom.
export type AdminUser = {
  id: string;
  email: string;
  ime_biznisa: string | null;
  plan: Plan;
  trial_do: string | null; // YYYY-MM-DD; null = bez trial roka
  blokiran: boolean;
  broj_porudzbina: number;
  kreiran: string | null; // created (YYYY-MM-DD)
};

// Status naloga za prikaz/kontrolu pristupa.
export type StanjeNaloga = "aktivan" | "trial" | "trial_istekao" | "blokiran";
