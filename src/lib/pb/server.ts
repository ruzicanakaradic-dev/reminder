import "server-only";
import PocketBase from "pocketbase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, SESSION_COOKIE, decodeToken, isUsableAdminToken, isUsableUserToken } from "@/lib/auth";

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
// Ako je nalog blokiran ili je trial istekao → preusmeri na /nalog-neaktivan.
export async function pbUser(): Promise<UserCtx> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isUsableUserToken(token)) redirect("/prijava");
  const pb = newClient();
  pb.authStore.save(token!, null);
  const userId = decodeToken(token)!.id!;
  await proveriStatusNaloga(pb, userId);
  return { pb, userId };
}

// Proverava da nalog nije blokiran i da trial nije istekao. Čita sopstveni red
// (korisnica sme da vidi sebe). paid nalog (Ružica) prolazi bez ograničenja.
// Greška pri čitanju se tiho ignoriše (ne zaključavamo zbog mrežnog problema).
async function proveriStatusNaloga(pb: PocketBase, userId: string): Promise<void> {
  try {
    const u = await pb.collection("users").getOne(userId, {
      fields: "plan,trial_do,blokiran",
    });
    const rec = u as unknown as { plan?: string; trial_do?: string; blokiran?: boolean };
    if (rec.blokiran === true) redirect("/nalog-neaktivan?razlog=blokiran");
    if (rec.plan !== "paid" && rec.trial_do) {
      const danas = new Date().toISOString().slice(0, 10);
      if (rec.trial_do < danas) redirect("/nalog-neaktivan?razlog=trial");
    }
  } catch (e) {
    // redirect() baca interni Next signal — propusti ga; ostalo tiho ignoriši.
    if (e && typeof e === "object" && "digest" in e) throw e;
  }
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

// ── Admin konzola ──────────────────────────────────────────────────
// Superuser klijent iz ADMIN kolačića (Igorova interaktivna admin sesija).
// Različito od pbAdmin() koji koristi env kredencijale za cron/push.
// Token PROVERAVA kod PocketBase-a (authRefresh) jer se preko njega radi
// nad svim korisnicama — lažan token ne sme da prođe. null = nije admin.
export async function pbAdminSessionOrNull(): Promise<PocketBase | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isUsableAdminToken(token)) return null;
  const pb = newClient();
  pb.authStore.save(token!, null);
  try {
    await pb.collection("_superusers").authRefresh();
    return pb;
  } catch {
    return null;
  }
}

// Isto, ali preusmerava na admin prijavu kad nije admin (za /admin stranice).
export async function pbAdminSession(): Promise<PocketBase> {
  const pb = await pbAdminSessionOrNull();
  if (!pb) redirect("/admin/prijava");
  return pb;
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
