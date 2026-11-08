import "server-only";
import PocketBase from "pocketbase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, decodeToken, isUsableUserToken } from "@/lib/auth";

// Adresa PocketBase servera (Railway), npr. https://pocketbase-production-xxxx.up.railway.app
export function pbUrl(): string {
  const url = process.env.POCKETBASE_URL;
  if (!url) {
    throw new Error("Nedostaje POCKETBASE_URL env promenljiva (adresa PocketBase servera).");
  }
  return url.replace(/\/+$/, "");
}

export function pocketbaseConfigured(): boolean {
  return Boolean(process.env.POCKETBASE_URL);
}

function newClient(): PocketBase {
  const pb = new PocketBase(pbUrl());
  // Na serveru se paralelni upiti ne smeju međusobno otkazivati.
  pb.autoCancellation(false);
  return pb;
}

export type UserCtx = { pb: PocketBase; userId: string };

// Klijent prijavljene korisnice. Svi upiti idu sa NJENIM tokenom, pa
// PocketBase pravila (user = @request.auth.id) garantuju da vidi samo svoje.
// Bez važeće prijave → preusmeri na /prijava.
export async function pbUser(): Promise<UserCtx> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isUsableUserToken(token)) redirect("/prijava");
  const pb = newClient();
  pb.authStore.save(token!, null);
  return { pb, userId: decodeToken(token)!.id! };
}

// Isto, ali bez preusmeravanja — za API rute koje vraćaju 401.
export async function pbUserOrNull(): Promise<UserCtx | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isUsableUserToken(token)) return null;
  const pb = newClient();
  pb.authStore.save(token!, null);
  return { pb, userId: decodeToken(token)!.id! };
}

// Kao pbUserOrNull, ali token PROVERAVA kod PocketBase-a (potpis, da nalog
// postoji). Obavezno svuda gde se userId koristi sa superuser klijentom —
// tamo pravila ne štite, pa lažan token ne sme da prođe.
export async function pbUserVerified(): Promise<UserCtx | null> {
  const ctx = await pbUserOrNull();
  if (!ctx) return null;
  try {
    const auth = await ctx.pb.collection("users").authRefresh();
    return { pb: ctx.pb, userId: auth.record.id };
  } catch {
    return null;
  }
}

// Neprijavljen klijent (za samu prijavu).
export function pbAnon(): PocketBase {
  return newClient();
}

// Superuser klijent — SAMO za pozadinske poslove koji rade preko svih
// korisnica (cron podsetnici, slanje push-a vlasnici porudžbine).
// Nikad za zahteve koje pokreće korisnica.
let adminToken: string | null = null;
let adminTokenExp = 0;

export async function pbAdmin(): Promise<PocketBase> {
  const pb = newClient();
  const now = Math.floor(Date.now() / 1000);
  if (adminToken && adminTokenExp - now > 300) {
    pb.authStore.save(adminToken, null);
    return pb;
  }
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Nedostaju POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD env promenljive (potrebne za podsetnike)."
    );
  }
  await pb.collection("_superusers").authWithPassword(email, password);
  adminToken = pb.authStore.token;
  adminTokenExp = decodeToken(adminToken)?.exp ?? now + 3600;
  return pb;
}
