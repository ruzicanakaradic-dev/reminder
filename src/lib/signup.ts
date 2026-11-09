import "server-only";
import { ClientResponseError } from "pocketbase";
import { pbAdmin } from "@/lib/pb/server";
import { KorisnickaGreska } from "@/lib/greske";

// Javna registracija (faza 4): posetilac sam otvara nalog sa 5 dana besplatnog
// probnog perioda. Kolekcija `users` ima Create pravilo = samo superuser, pa
// nalog pravimo preko env superuser klijenta (pbAdmin), a NE direktno sa
// klijenta — tako javno direktno kreiranje ostaje isključeno, a prolazi samo
// ovaj proveren serverski put. Nova korisnica: plan=free + trial_do (+5 dana).

export const TRIAL_DANA = 5;

export async function registrujNalog(input: {
  ime_biznisa: string;
  email: string;
  lozinka: string;
}): Promise<void> {
  const ime = input.ime_biznisa.trim();
  const email = input.email.trim().toLowerCase();
  const lozinka = input.lozinka ?? "";

  if (!ime) throw new KorisnickaGreska("Unesi naziv biznisa.");
  if (!email || !email.includes("@")) throw new KorisnickaGreska("Unesi ispravan email.");
  if (lozinka.length < 8) throw new KorisnickaGreska("Lozinka mora imati bar 8 znakova.");

  const pb = await pbAdmin();

  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DANA);
  const trialDo = d.toISOString().slice(0, 10);

  try {
    await pb.collection("users").create({
      email,
      password: lozinka,
      passwordConfirm: lozinka,
      emailVisibility: true,
      ime_biznisa: ime,
      plan: "free",
      trial_do: trialDo,
      blokiran: false,
    });
  } catch (e) {
    if (e instanceof ClientResponseError) {
      const data = e.response?.data as Record<string, { message?: string }> | undefined;
      if (data?.email) {
        throw new KorisnickaGreska("Nalog sa ovim email-om već postoji — prijavi se.");
      }
      throw new KorisnickaGreska("Podaci nisu ispravni. Proveri email i lozinku.");
    }
    throw e;
  }
}
