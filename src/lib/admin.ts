import "server-only";
import type PocketBase from "pocketbase";
import { pbAdminSession } from "@/lib/pb/server";
import type { AdminUser, Plan, StanjeNaloga } from "@/lib/types";
import { KorisnickaGreska } from "@/lib/greske";

// Admin (SaaS) sloj: upravljanje nalozima poslastičarki preko superuser sesije.
// SVAKA funkcija prvo traži admin sesiju (pbAdminSession → redirect ako nije
// admin), pa radi nad kolekcijom `users`. Obične korisnice ovo ne mogu da zovu.

type Rec = Record<string, unknown>;
const s = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const b = (v: unknown): boolean => v === true;

// Datum (YYYY-MM-DD) iz PB created/polja; prazno → null.
function datum(v: unknown): string | null {
  const str = s(v);
  return str ? str.slice(0, 10) : null;
}

function plan(v: unknown): Plan {
  return v === "paid" ? "paid" : "free";
}

// Stanje naloga iz polja (za prikaz i kontrolu pristupa).
export function stanjeNaloga(u: Pick<AdminUser, "blokiran" | "plan" | "trial_do">): StanjeNaloga {
  if (u.blokiran) return "blokiran";
  if (u.plan === "paid") return "aktivan";
  // free → trial; istekao ako postoji rok i prošao je
  if (u.trial_do && u.trial_do < danasISO()) return "trial_istekao";
  return "trial";
}

function danasISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toAdminUser(r: Rec, brojPorudzbina: number): AdminUser {
  return {
    id: String(r.id),
    email: s(r.email) ?? "",
    ime_biznisa: s(r.ime_biznisa),
    plan: plan(r.plan),
    trial_do: datum(r.trial_do),
    blokiran: b(r.blokiran),
    broj_porudzbina: brojPorudzbina,
    kreiran: datum(r.created),
  };
}

// Broj porudžbina po korisnici (jedan prolaz kroz orders, grupisano po user).
async function brojPorudzbinaPoKorisnici(pb: PocketBase): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  const recs = (await pb.collection("orders").getFullList({ fields: "user" })) as Rec[];
  for (const r of recs) {
    const uid = s(r.user);
    if (uid) mapa.set(uid, (mapa.get(uid) ?? 0) + 1);
  }
  return mapa;
}

// Lista svih korisnica sa statusom i brojem porudžbina (za admin pregled).
export async function listaKorisnica(): Promise<AdminUser[]> {
  const pb = await pbAdminSession();
  const [users, brojevi] = await Promise.all([
    pb.collection("users").getFullList({ sort: "-created" }) as Promise<Rec[]>,
    brojPorudzbinaPoKorisnici(pb),
  ]);
  return users.map((u) => toAdminUser(u, brojevi.get(String(u.id)) ?? 0));
}

// Kreiranje naloga iz konzole (Igor pravi nalog koleginici).
// plan "paid" = odmah plaćena; "free" = trial sa rokom trial_dana od danas.
export async function kreirajNalog(input: {
  email: string;
  lozinka: string;
  ime_biznisa?: string;
  plan?: Plan;
  trial_dana?: number;
}): Promise<AdminUser> {
  const pb = await pbAdminSession();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new KorisnickaGreska("Unesi ispravan email.");
  if ((input.lozinka ?? "").length < 8) throw new KorisnickaGreska("Lozinka mora imati bar 8 znakova.");

  const planVal: Plan = input.plan ?? "free";
  let trialDo: string | null = null;
  if (planVal === "free") {
    const dana = input.trial_dana && input.trial_dana > 0 ? input.trial_dana : 5;
    const d = new Date();
    d.setDate(d.getDate() + dana);
    trialDo = d.toISOString().slice(0, 10);
  }

  const rec = (await pb.collection("users").create({
    email,
    password: input.lozinka,
    passwordConfirm: input.lozinka,
    emailVisibility: true,
    ime_biznisa: input.ime_biznisa?.trim() || null,
    plan: planVal,
    trial_do: trialDo,
    blokiran: false,
  })) as Rec;

  return toAdminUser(rec, 0);
}

// Blokiranje / odblokiranje naloga.
export async function postaviBlokiran(userId: string, blokiran: boolean): Promise<void> {
  const pb = await pbAdminSession();
  await pb.collection("users").update(userId, { blokiran });
}

// Promena plana free ↔ paid. Kod prelaska na paid briše trial rok.
export async function postaviPlan(userId: string, plan: Plan): Promise<void> {
  const pb = await pbAdminSession();
  const patch: Rec = { plan };
  if (plan === "paid") patch.trial_do = null;
  await pb.collection("users").update(userId, patch);
}

// Produženje trial roka (postavi novi datum isteka, N dana od danas).
export async function produziTrial(userId: string, dana: number): Promise<void> {
  const pb = await pbAdminSession();
  const d = new Date();
  d.setDate(d.getDate() + (dana > 0 ? dana : 5));
  await pb.collection("users").update(userId, { plan: "free", trial_do: d.toISOString().slice(0, 10) });
}
