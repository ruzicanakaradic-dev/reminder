import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Customer, Order, OrderInput, Status } from "@/lib/types";

// ── Kupci ──────────────────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .order("ime", { ascending: true });
  if (error) throw error;
  return data as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

// Pronađi ili napravi kupca po imenu; osveži kontakt/grad/adresu
async function ensureCustomer(
  ime: string,
  telefon: string | null,
  grad: string | null,
  adresa: string | null
): Promise<string> {
  const sb = supabaseAdmin();
  const cleanIme = ime.trim();

  const { data: found, error: findErr } = await sb
    .from("customers")
    .select("id")
    .ilike("ime", cleanIme)
    .limit(1);
  if (findErr) throw findErr;

  const patch: Record<string, string> = {};
  if (telefon) patch.telefon = telefon;
  if (grad) patch.grad = grad;
  if (adresa) patch.adresa = adresa;

  if (found && found.length > 0) {
    if (Object.keys(patch).length) {
      await sb.from("customers").update(patch).eq("id", found[0].id);
    }
    return found[0].id as string;
  }

  const { data: created, error: createErr } = await sb
    .from("customers")
    .insert({ ime: cleanIme, ...patch })
    .select("id")
    .single();
  if (createErr) throw createErr;
  return created!.id as string;
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
  const sb = supabaseAdmin();
  let q = sb.from("orders").select("*");

  if (filter.status) q = q.eq("status", filter.status);
  if (filter.customerId) q = q.eq("customer_id", filter.customerId);
  if (filter.from) q = q.gte("datum_isporuke", filter.from);
  if (filter.to) q = q.lte("datum_isporuke", filter.to);
  if (filter.search) {
    // ukloni znakove koji bi pokvarili PostgREST "or" filter (zarez, zagrade, *)
    const clean = filter.search.replace(/[,()*%]/g, " ").trim();
    if (clean) {
      const s = `%${clean}%`;
      q = q.or(`kupac_ime.ilike.${s},proizvod.ilike.${s},grad.ilike.${s},opis.ilike.${s}`);
    }
  }

  const { data, error } = await q.order("datum_isporuke", { ascending: true });
  if (error) throw error;
  return data as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function saveOrder(input: OrderInput): Promise<Order> {
  const sb = supabaseAdmin();
  const customerId = await ensureCustomer(
    input.kupac_ime,
    input.kupac_telefon ?? null,
    input.grad ?? null,
    input.adresa ?? null
  );

  const total =
    input.total != null
      ? input.total
      : input.tezina_kg != null && input.cena_po_kg != null
        ? Number((input.tezina_kg * input.cena_po_kg).toFixed(2))
        : null;

  const row = {
    customer_id: customerId,
    kupac_ime: input.kupac_ime.trim(),
    kupac_telefon: input.kupac_telefon ?? null,
    datum_porudzbine: input.datum_porudzbine,
    datum_isporuke: input.datum_isporuke,
    vreme_isporuke: input.vreme_isporuke ?? null,
    proizvod: input.proizvod.trim(),
    opis: input.opis ?? null,
    napomena: input.napomena ?? null,
    slika: input.slika ?? null,
    tezina_kg: input.tezina_kg ?? null,
    cena_po_kg: input.cena_po_kg ?? null,
    total,
    adresa: input.adresa ?? null,
    grad: input.grad ?? null,
    status: input.status,
  };

  if (input.id) {
    const { data, error } = await sb
      .from("orders")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Order;
  }

  const { data, error } = await sb.from("orders").insert(row).select("*").single();
  if (error) throw error;
  return data as Order;
}

export async function updateStatus(id: string, status: Status): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("orders").delete().eq("id", id);
  if (error) throw error;
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
    const prihod = o.total ?? 0;
    ukupanPrihod += prihod;
    ukupnoKg += kg;
    add(kupci, o.kupac_ime, kg, prihod);
    add(gradovi, o.grad ?? "—", kg, prihod);
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
