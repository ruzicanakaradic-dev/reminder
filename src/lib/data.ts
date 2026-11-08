import "server-only";
import type PocketBase from "pocketbase";
import { ClientResponseError } from "pocketbase";
import { pbUser } from "@/lib/pb/server";
import type { AppSettings, Customer, CustomerInput, Order, OrderInput, OrderItem, Status } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  jePolazisteIndjija,
  obracunajTransport,
  predlozenaKm,
  predlozenaPutarina,
} from "@/lib/transport";
import { besplatnaDostavaPoPravilu, ukupnaCena } from "@/lib/costs";
import { KorisnickaGreska } from "@/lib/greske";

// ── Pomoćne funkcije ───────────────────────────────────────────────

// Pravilna velika početna slova (srpska latinica).
// "beograd" → "Beograd", "kralja PETRA 12a" → "Kralja Petra 12a".
// Sve prvo spusti na mala pa podigne prvo slovo svake reči (posle razmaka,
// crtice, apostrofa, tačke, kose crte). Brojevi ("12a", "bb") ostaju kako jesu.
export function toTitleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-'’./])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

// Isto, ali za opciona polja: prazna vrednost ostaje null.
function toTitleCaseOrNull(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v ? toTitleCase(v) : null;
}

// Sentence-case: veliko prvo slovo + veliko posle svake tačke/uzvika/upitnika
// i posle novog reda. Ostatak teksta ostaje TAČNO kako je ukucan (ne diramo
// vlastite imenice/skraćenice usred rečenice). Za napomenu, opis, naziv proizvoda.
export function toSentenceCase(raw: string): string {
  return raw
    .trim()
    .replace(/(^|[.!?]\s+|\n\s*)(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function toSentenceCaseOrNull(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v ? toSentenceCase(v) : null;
}

// Dovodi broj telefona na +381 format, bez razmaka i drugih znakova
// (razmak može da pravi problem pri pozivanju).
// Ako je već upisan sa "+" (međunarodni) — čuva se pozivni, samo se očisti.
// Inače: "064 123 4567" → "+381641234567", "381..." → "+381...",
// "00381..." → "+381...", "641234567" → "+381641234567".
export function normalizePhone(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;

  const digits = v.replace(/\D/g, "");
  if (!digits) return v; // nema cifara — vrati original

  // Već upisala + (npr. +381...) — poštuj pozivni, ukloni razmake i znakove.
  if (v.startsWith("+")) return "+" + digits;

  let d = digits;
  if (d.startsWith("00")) d = d.slice(2); // 00381 → 381
  if (d.startsWith("381")) return "+" + d;
  if (d.startsWith("0")) return "+381" + d.slice(1); // 064... → +38164...
  return "+381" + d; // 64... → +38164...
}

// ── PocketBase ↔ tipovi aplikacije ─────────────────────────────────
//
// PocketBase ne čuva NULL: prazan tekst je "", prazan broj je 0. Aplikacija
// (tipovi, obračuni, prikaz) radi sa null, pa ovde vraćamo null tamo gde
// "prazno" znači "nije uneto". Nazivi kolona: customer → customer_id,
// order → order_id, created/updated → created_at/updated_at.

type Rec = Record<string, unknown> & { id: string; collectionId: string; collectionName: string };

const s = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const n = (v: unknown): number | null => (typeof v === "number" && v !== 0 ? v : null);

function toCustomer(r: Rec): Customer {
  return {
    id: r.id,
    redni_broj: Number(r.redni_broj) || 0,
    ime: String(r.ime ?? ""),
    telefon: s(r.telefon),
    napomena: s(r.napomena),
    grad: s(r.grad),
    adresa: s(r.adresa),
    created_at: String(r.created ?? ""),
  };
}

function toOrder(pb: PocketBase, r: Rec): Order {
  const licno = r.licno_preuzimanje === true;
  const km = n(r.transport_km);
  // Naplaćena dostava: 0 je validna vrednost ("besplatna dostava"), ali samo
  // kad prevoza uopšte ima. Bez prevoza (lično preuzimanje ili bez km) = null.
  const cenaRaw = typeof r.transport_cena === "number" ? r.transport_cena : 0;
  const transportCena = licno || (km == null && cenaRaw === 0) ? null : cenaRaw;
  const slika = s(r.slika);
  return {
    id: r.id,
    redni_broj: Number(r.redni_broj) || 0,
    customer_id: s(r.customer),
    kupac_ime: String(r.kupac_ime ?? ""),
    kupac_telefon: s(r.kupac_telefon),
    datum_porudzbine: s(r.datum_porudzbine) ?? String(r.created ?? "").slice(0, 10),
    datum_isporuke: String(r.datum_isporuke ?? ""),
    vreme_isporuke: s(r.vreme_isporuke),
    proizvod: String(r.proizvod ?? ""),
    opis: s(r.opis),
    napomena: s(r.napomena),
    slika: slika ? pb.files.getURL(r, slika) : null,
    tezina_kg: n(r.tezina_kg),
    cena_po_kg: n(r.cena_po_kg),
    total: n(r.total),
    adresa: s(r.adresa),
    grad: s(r.grad),
    dekoracija_cena: n(r.dekoracija_cena),
    licno_preuzimanje: licno,
    transport_km: km,
    transport_litara: n(r.transport_litara),
    transport_gorivo: n(r.transport_gorivo),
    transport_amortizacija: n(r.transport_amortizacija),
    transport_putarina: n(r.transport_putarina),
    transport_predlog: n(r.transport_predlog),
    transport_cena: transportCena,
    status: (s(r.status) ?? "primljena") as Status,
    reminded_2d: r.reminded_2d === true,
    reminded_1d: r.reminded_1d === true,
    reminded_0d: r.reminded_0d === true,
    reminded_2h: r.reminded_2h === true,
    created_at: String(r.created ?? ""),
    updated_at: String(r.updated ?? ""),
  };
}

function toItem(r: Rec): OrderItem {
  return {
    id: r.id,
    order_id: String(r.order ?? ""),
    redosled: Number(r.redosled) || 0,
    naziv: String(r.naziv ?? ""),
    tezina_kg: n(r.tezina_kg),
    cena_po_kg: n(r.cena_po_kg),
    total: n(r.total),
  };
}

// Sledeći redni broj za ovu korisnicu (pravila PocketBase-a već filtriraju
// na njene redove, pa je ovo njen maksimum + 1).
async function nextRedniBroj(pb: PocketBase, collection: "customers" | "orders"): Promise<number> {
  const res = await pb.collection(collection).getList(1, 1, { sort: "-redni_broj", fields: "redni_broj" });
  const max = Number((res.items[0] as Rec | undefined)?.redni_broj) || 0;
  return max + 1;
}

// Kreiranje sa rednim brojem; ako dve porudžbine istovremeno dobiju isti broj,
// jedinstveni indeks odbije drugu → pokušaj ponovo sa sledećim brojem.
async function createNumbered(
  pb: PocketBase,
  collection: "customers" | "orders",
  data: Record<string, unknown>
): Promise<Rec> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const redni_broj = await nextRedniBroj(pb, collection);
    try {
      return (await pb.collection(collection).create({ ...data, redni_broj })) as Rec;
    } catch (e) {
      const dup = e instanceof ClientResponseError && e.status === 400 && attempt < 2;
      if (!dup) throw e;
    }
  }
  throw new Error("Nije uspelo dodeljivanje rednog broja.");
}

// Slika primera iz forme: data URL (nova slika) → fajl; http URL (već
// sačuvana, nepromenjena) → ne diramo; prazno → brišemo.
function slikaPatch(slika: string | null | undefined, isUpdate: boolean): Record<string, unknown> {
  const v = (slika ?? "").trim();
  if (v.startsWith("data:")) {
    const m = v.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!m) throw new KorisnickaGreska("Slika nije ispravnog formata.");
    const mime = m[1] || "image/webp";
    const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
    const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "webp";
    return { slika: new File([bytes], `primer.${ext}`, { type: mime }) };
  }
  if (/^https?:\/\//.test(v)) return {};
  return isUpdate ? { slika: null } : {};
}

// ── Podešavanja (troškovi prevoza) ─────────────────────────────────

// Tip goriva iz baze → sigurna vrednost ("dizel" default).
function tipGoriva(v: unknown): AppSettings["tip_goriva"] {
  return v === "benzin" ? "benzin" : "dizel";
}

// Podešavanja ove korisnice; prazna polja → podrazumevane vrednosti.
export async function getSettings(): Promise<AppSettings> {
  const { pb } = await pbUser();
  try {
    const res = await pb.collection("app_settings").getList(1, 1);
    const r = res.items[0] as Rec | undefined;
    if (!r) return { ...DEFAULT_SETTINGS };
    return {
      polaziste_adresa: s(r.polaziste_adresa) ?? DEFAULT_SETTINGS.polaziste_adresa,
      polaziste_lat: n(r.polaziste_lat) ?? DEFAULT_SETTINGS.polaziste_lat,
      polaziste_lon: n(r.polaziste_lon) ?? DEFAULT_SETTINGS.polaziste_lon,
      tip_goriva: tipGoriva(r.tip_goriva),
      gorivo_cena_rsd: n(r.gorivo_cena_rsd) ?? DEFAULT_SETTINGS.gorivo_cena_rsd,
      potrosnja_l_100km: n(r.potrosnja_l_100km) ?? DEFAULT_SETTINGS.potrosnja_l_100km,
      amortizacija_rsd_km: n(r.amortizacija_rsd_km) ?? DEFAULT_SETTINGS.amortizacija_rsd_km,
      besplatna_dostava_od: n(r.besplatna_dostava_od) ?? DEFAULT_SETTINGS.besplatna_dostava_od,
    };
  } catch (e) {
    if (e instanceof ClientResponseError && (e.status === 401 || e.status === 403)) throw e;
    return { ...DEFAULT_SETTINGS };
  }
}

// Tekstualna polja (ne smeju kroz brojčani filter) i numerička polja (≥0).
const TEXT_SETTINGS = new Set(["polaziste_adresa", "tip_goriva"]);
const NUM_SETTINGS = new Set([
  "polaziste_lat",
  "polaziste_lon",
  "gorivo_cena_rsd",
  "potrosnja_l_100km",
  "amortizacija_rsd_km",
  "besplatna_dostava_od",
]);

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const { pb, userId } = await pbUser();
  const clean: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) continue;
    if (TEXT_SETTINGS.has(k)) {
      clean[k] = k === "tip_goriva" ? (v === "benzin" ? "benzin" : "dizel") : String(v).trim();
    } else if (NUM_SETTINGS.has(k) && !isNaN(Number(v)) && Number(v) >= 0) {
      clean[k] = Number(v);
    }
  }
  const res = await pb.collection("app_settings").getList(1, 1);
  const existing = res.items[0] as Rec | undefined;
  if (existing) {
    await pb.collection("app_settings").update(existing.id, clean);
  } else {
    await pb.collection("app_settings").create({ ...DEFAULT_SETTINGS, ...clean, user: userId });
  }
  return getSettings();
}

// ── Kupci ──────────────────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const { pb } = await pbUser();
  const recs = (await pb.collection("customers").getFullList({ sort: "ime" })) as Rec[];
  return recs.map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { pb } = await pbUser();
  try {
    return toCustomer((await pb.collection("customers").getOne(id)) as Rec);
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 404) return null;
    throw e;
  }
}

// Polja prevoza za zadati grad (podrazumevana tabela rastojanja + trenutna
// podešavanja). Koristi se kad se grad kupca ispravi, da dostava na porudžbini
// odgovara ispravljenom gradu. Lično preuzimanje = bez prevoza.
function transportFieldsZaGrad(
  grad: string | null,
  licnoPreuzimanje: boolean,
  total: number | null,
  settings: AppSettings
) {
  if (licnoPreuzimanje) {
    return {
      transport_km: null, transport_litara: null, transport_gorivo: null,
      transport_amortizacija: null, transport_putarina: null,
      transport_predlog: null, transport_cena: null,
    };
  }
  // Tabela rastojanja važi samo za Ružicino polazište (Inđija). Za druge
  // korisnice ostaje prazno — dostava se preračuna u formi (auto-ruta).
  const indjija = jePolazisteIndjija(settings.polaziste_lat, settings.polaziste_lon);
  const km = indjija ? predlozenaKm(grad) : null;
  const putarina = indjija ? predlozenaPutarina(grad) : 0;
  const t = km && km > 0 ? obracunajTransport(km, putarina, settings) : null;
  const predlog = t?.predlog ?? null;
  const cena =
    predlog != null && besplatnaDostavaPoPravilu(total, settings.besplatna_dostava_od) ? 0 : predlog;
  return {
    transport_km: t?.km ?? null,
    transport_litara: t?.litara ?? null,
    transport_gorivo: t?.gorivo ?? null,
    transport_amortizacija: t?.amortizacija ?? null,
    transport_putarina: t?.putarina ?? null,
    transport_predlog: predlog,
    transport_cena: cena,
  };
}

// Izmena postojećeg kupca (ručna ispravka greške). Ista normalizacija kao pri
// čuvanju porudžbine (title-case ime/grad/adresa, +381 telefon). Ispravka imena
// i telefona uvek se propagira na snapshot u porudžbinama tog kupca. Ako je
// uključeno `primeni_adresu_na_porudzbine`, i ispravljeni grad i adresa prelaze
// na sve porudžbine kupca (uz preračun dostave kad se grad promeni).
export async function updateCustomer(input: CustomerInput): Promise<Customer> {
  const { pb } = await pbUser();
  const ime = toTitleCase(input.ime);
  if (!ime) throw new KorisnickaGreska("Ime kupca je obavezno.");
  const telefon = normalizePhone(input.telefon);
  const grad = toTitleCaseOrNull(input.grad);
  const adresa = toTitleCaseOrNull(input.adresa);
  const napomena = toSentenceCaseOrNull(input.napomena);

  const saved = (await pb
    .collection("customers")
    .update(input.id, { ime, telefon, grad, adresa, napomena })) as Rec;

  const orders = (await pb.collection("orders").getFullList({
    filter: pb.filter("customer = {:id}", { id: input.id }),
    fields: "id,grad,total,licno_preuzimanje",
  })) as Rec[];

  const settings = input.primeni_adresu_na_porudzbine ? await getSettings() : null;
  for (const o of orders) {
    const patch: Record<string, unknown> = { kupac_ime: ime, kupac_telefon: telefon };
    if (settings) {
      Object.assign(patch, { grad, adresa });
      if ((s(o.grad) ?? null) !== (grad ?? null)) {
        Object.assign(patch, transportFieldsZaGrad(grad, o.licno_preuzimanje === true, n(o.total), settings));
      }
    }
    await pb.collection("orders").update(o.id, patch);
  }

  return toCustomer(saved);
}

// Pronađi ili napravi kupca po imenu; osveži kontakt/grad/adresu
async function ensureCustomer(
  pb: PocketBase,
  userId: string,
  ime: string,
  telefon: string | null,
  grad: string | null,
  adresa: string | null
): Promise<string> {
  const cleanIme = ime.trim();

  // "~" je LIKE (bez obzira na velika/mala slova); tačno poklapanje proveravamo ovde.
  const candidates = (await pb.collection("customers").getFullList({
    filter: pb.filter("ime ~ {:ime}", { ime: cleanIme }),
    fields: "id,ime",
  })) as Rec[];
  const found = candidates.find((c) => String(c.ime).toLowerCase() === cleanIme.toLowerCase());

  const patch: Record<string, string> = {};
  if (telefon) patch.telefon = telefon;
  if (grad) patch.grad = grad;
  if (adresa) patch.adresa = adresa;

  if (found) {
    if (Object.keys(patch).length) await pb.collection("customers").update(found.id, patch);
    return found.id;
  }

  const created = await createNumbered(pb, "customers", { user: userId, ime: cleanIme, ...patch });
  return created.id;
}

// Jedinstveni nazivi proizvoda koje je korisnica do sada pravila,
// poređani po učestalosti (najčešći prvi) — za autocomplete u formi.
export async function getProductNames(): Promise<string[]> {
  const { pb } = await pbUser();
  const counts = new Map<string, number>();
  const bump = (raw: string | null) => {
    const name = (raw ?? "").trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  };

  // Primarni izvor: pojedinačne stavke porudžbina
  const items = (await pb.collection("order_items").getFullList({ fields: "naziv" })) as Rec[];
  for (const r of items) bump(s(r.naziv));

  // Dopuna: stare porudžbine bez stavki (proizvod = zbir naziva razdvojen zarezom)
  const orders = (await pb.collection("orders").getFullList({ fields: "proizvod" })) as Rec[];
  for (const r of orders) {
    for (const part of String(r.proizvod ?? "").split(",")) bump(part);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sr"))
    .map(([name]) => name);
}

// ── Porudžbine ─────────────────────────────────────────────────────

export type OrderFilter = {
  status?: Status;
  search?: string;
  customerId?: string;
  from?: string; // datum_isporuke >=
  to?: string; // datum_isporuke <=
};

export async function getOrders(filter: OrderFilter = {}): Promise<Order[]> {
  const { pb } = await pbUser();
  const parts: string[] = [];
  const params: Record<string, string> = {};

  if (filter.status) { parts.push("status = {:status}"); params.status = filter.status; }
  if (filter.customerId) { parts.push("customer = {:cid}"); params.cid = filter.customerId; }
  // Datumi su tekst "YYYY-MM-DD", pa poređenje radi i leksički.
  if (filter.from) { parts.push("datum_isporuke >= {:from}"); params.from = filter.from; }
  if (filter.to) { parts.push("datum_isporuke <= {:to}"); params.to = filter.to; }
  const q = (filter.search ?? "").trim();
  if (q) {
    parts.push("(kupac_ime ~ {:q} || proizvod ~ {:q} || grad ~ {:q} || opis ~ {:q})");
    params.q = q;
  }

  const recs = (await pb.collection("orders").getFullList({
    sort: "datum_isporuke",
    filter: parts.length ? pb.filter(parts.join(" && "), params) : "",
  })) as Rec[];
  return recs.map((r) => toOrder(pb, r));
}

export async function getOrder(id: string): Promise<Order | null> {
  const { pb } = await pbUser();
  let rec: Rec;
  try {
    rec = (await pb.collection("orders").getOne(id)) as Rec;
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 404) return null;
    throw e;
  }

  const items = (await pb.collection("order_items").getFullList({
    filter: pb.filter("order = {:id}", { id }),
    sort: "redosled",
  })) as Rec[];

  return { ...toOrder(pb, rec), items: items.map(toItem) };
}

// Normalizuje stavke iz forme: računa total svake stavke i odbacuje prazne
type NormItem = { naziv: string; tezina_kg: number | null; cena_po_kg: number | null; total: number | null };

function normalizeItems(input: OrderInput): NormItem[] {
  const raw =
    input.items && input.items.length
      ? input.items
      : // fallback: stara jedno-proizvodna porudžbina
        [{ naziv: input.proizvod, tezina_kg: input.tezina_kg, cena_po_kg: input.cena_po_kg, total: input.total }];

  return raw
    .filter((i) => (i.naziv ?? "").trim())
    .map((i) => {
      const tezina = i.tezina_kg ?? null;
      const cena = i.cena_po_kg ?? null;
      const total =
        i.total != null
          ? i.total
          : tezina != null && cena != null
            ? Number((tezina * cena).toFixed(2))
            : null;
      return { naziv: toSentenceCase(i.naziv), tezina_kg: tezina, cena_po_kg: cena, total };
    });
}

export async function saveOrder(input: OrderInput): Promise<Order> {
  const { pb, userId } = await pbUser();

  // Pravilna velika slova da se u statistici ne cepaju isti kupci/gradovi
  const kupacIme = toTitleCase(input.kupac_ime);
  const grad = toTitleCaseOrNull(input.grad);
  const adresa = toTitleCaseOrNull(input.adresa);
  const telefon = normalizePhone(input.kupac_telefon);

  const customerId = await ensureCustomer(pb, userId, kupacIme, telefon, grad, adresa);

  const items = normalizeItems(input);
  if (items.length === 0) throw new KorisnickaGreska("Bar jedan proizvod je obavezan.");

  // Zbirni podaci na nivou porudžbine (za listu, kalendar, statistiku)
  const grandTotal = items.reduce((sum, i) => sum + (i.total ?? 0), 0) || null;
  const zbirTezina = items.reduce((sum, i) => sum + (i.tezina_kg ?? 0), 0) || null;
  const proizvodSummary = items.map((i) => i.naziv).join(", ");

  // Lično preuzimanje: kupac dolazi kod nas → prevoza nema. Sva polja prevoza
  // ostaju prazna (čak i ako su ranije bila popunjena kao "besplatna dostava").
  const licnoPreuzimanje = input.licno_preuzimanje === true;

  // Transport: km iz forme (ručno) ili iz tabele rastojanja po gradu.
  // Trošak se "zaključava" na porudžbini po TRENUTNIM podešavanjima, da bi
  // istorijska statistika ostala tačna i posle promene cene dizela.
  const settings = await getSettings();
  // Ružicina ugrađena tabela rastojanja važi SAMO kad je polazište Inđija.
  // Nove korisnice sa drugim polazištem koriste vrednosti iz forme (auto-ruta
  // i auto-putarina iz /api/rastojanje), ne Ružicinu tabelu.
  const indjija = jePolazisteIndjija(settings.polaziste_lat, settings.polaziste_lon);
  const kmPovratno =
    input.transport_km != null && !isNaN(input.transport_km)
      ? input.transport_km
      : indjija
        ? predlozenaKm(grad)
        : null;
  // Putarina: za Inđiju tabela ima prednost za poznata mesta; inače (i za nove
  // korisnice) procena/auto-putarina prosleđena iz forme. Fallback 0.
  const tablicna = indjija ? predlozenaPutarina(grad) : 0;
  const putarinaPovratno =
    tablicna > 0
      ? tablicna
      : input.transport_putarina != null && !isNaN(input.transport_putarina)
        ? input.transport_putarina
        : 0;
  // Kod ličnog preuzimanja ne računamo prevoz uopšte.
  const t = !licnoPreuzimanje && kmPovratno && kmPovratno > 0
    ? obracunajTransport(kmPovratno, putarinaPovratno, settings)
    : null;
  const dekoracijaCena =
    input.dekoracija_cena != null && input.dekoracija_cena > 0 ? input.dekoracija_cena : null;
  const unetaCena =
    input.transport_cena != null && !isNaN(input.transport_cena)
      ? input.transport_cena
      : (t?.predlog ?? null);
  // Torte/kolači iznad praga besplatne dostave (bez topera/dekoracije) →
  // dostava je besplatna (samo ako dostave uopšte ima). Lično preuzimanje → nema dostave.
  const transportCena = licnoPreuzimanje
    ? null
    : unetaCena != null && besplatnaDostavaPoPravilu(grandTotal, settings.besplatna_dostava_od)
      ? 0
      : unetaCena;

  const row: Record<string, unknown> = {
    customer: customerId,
    kupac_ime: kupacIme,
    kupac_telefon: telefon,
    datum_porudzbine: input.datum_porudzbine,
    datum_isporuke: input.datum_isporuke,
    vreme_isporuke: input.vreme_isporuke ?? null,
    proizvod: proizvodSummary,
    opis: toSentenceCaseOrNull(input.opis),
    napomena: toSentenceCaseOrNull(input.napomena),
    tezina_kg: zbirTezina,
    cena_po_kg: items.length === 1 ? items[0].cena_po_kg : null,
    total: grandTotal,
    adresa,
    grad,
    // Prazno ili 0 = nema dekoracije
    dekoracija_cena: dekoracijaCena,
    licno_preuzimanje: licnoPreuzimanje,
    transport_km: t?.km ?? null,
    transport_litara: t?.litara ?? null,
    transport_gorivo: t?.gorivo ?? null,
    transport_amortizacija: t?.amortizacija ?? null,
    transport_putarina: t?.putarina ?? null,
    transport_predlog: t?.predlog ?? null,
    transport_cena: transportCena,
    status: input.status,
    ...slikaPatch(input.slika, Boolean(input.id)),
  };

  const saved = input.id
    ? ((await pb.collection("orders").update(input.id, row)) as Rec)
    : await createNumbered(pb, "orders", { ...row, user: userId });
  const orderId = saved.id;

  // Zameni stavke: obriši postojeće pa upiši nove (jednostavno i pouzdano)
  const old = (await pb.collection("order_items").getFullList({
    filter: pb.filter("order = {:id}", { id: orderId }),
    fields: "id",
  })) as Rec[];
  for (const o of old) await pb.collection("order_items").delete(o.id);
  for (const [idx, i] of items.entries()) {
    await pb.collection("order_items").create({ user: userId, order: orderId, redosled: idx, ...i });
  }

  return toOrder(pb, saved);
}

export async function updateStatus(id: string, status: Status): Promise<void> {
  const { pb } = await pbUser();
  await pb.collection("orders").update(id, { status });
}

// Stavke se brišu automatski (cascadeDelete na relaciji order_items.order).
export async function deleteOrder(id: string): Promise<void> {
  const { pb } = await pbUser();
  await pb.collection("orders").delete(id);
}

// ── Statistika ─────────────────────────────────────────────────────

export type StatBucket = { kljuc: string; brojPorudzbina: number; kg: number; prihod: number };
export type Stats = {
  ukupnoPorudzbina: number;
  ukupanPrihod: number;
  ukupnoKg: number;
  poStatusu: Record<Status, number>;
  poKupcu: StatBucket[];
  poGradu: StatBucket[];
  poProizvodu: StatBucket[];
};

export async function getStats(): Promise<Stats> {
  const orders = await getOrders();

  const poStatusu: Record<Status, number> = { primljena: 0, u_radu: 0, zavrseno: 0, isporuceno: 0 };
  const kupci = new Map<string, StatBucket>();
  const gradovi = new Map<string, StatBucket>();
  const proizvodi = new Map<string, StatBucket>();

  let ukupanPrihod = 0;
  let ukupnoKg = 0;

  const add = (m: Map<string, StatBucket>, kljuc: string, kg: number, prihod: number) => {
    const k = kljuc.trim() || "—";
    const b = m.get(k) ?? { kljuc: k, brojPorudzbina: 0, kg: 0, prihod: 0 };
    b.brojPorudzbina += 1;
    b.kg += kg;
    b.prihod += prihod;
    m.set(k, b);
  };

  for (const o of orders) {
    poStatusu[o.status] += 1;
    const kg = o.tezina_kg ?? 0;
    const prihod = ukupnaCena(o);
    ukupanPrihod += prihod;
    ukupnoKg += kg;
    // Normalizujemo ključ da se "beograd"/"Beograd" spoje u jedan red,
    // i za postojeće porudžbine unete pre ove izmene.
    add(kupci, toTitleCase(o.kupac_ime), kg, prihod);
    add(gradovi, toTitleCaseOrNull(o.grad) ?? "—", kg, prihod);
    add(proizvodi, o.proizvod, kg, prihod);
  }

  const sortByPrihod = (a: StatBucket, b: StatBucket) =>
    b.prihod - a.prihod || b.brojPorudzbina - a.brojPorudzbina;

  return {
    ukupnoPorudzbina: orders.length,
    ukupanPrihod,
    ukupnoKg,
    poStatusu,
    poKupcu: [...kupci.values()].sort(sortByPrihod),
    poGradu: [...gradovi.values()].sort(sortByPrihod),
    poProizvodu: [...proizvodi.values()].sort(sortByPrihod),
  };
}
