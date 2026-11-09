import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { pbAdmin, pocketbaseConfigured } from "@/lib/pb/server";
import { TRIAL_DANA } from "@/lib/signup";

export const dynamic = "force-dynamic";

function baseUrl(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}`;
}

function sigurniNext(raw: string | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

// Povratak sa Google-a: razmenimo `code` za PB sesiju (authWithOAuth2Code),
// nov nalog (bez plana) dobije free + trial kao registracija, pa postavimo
// isti httpOnly kolačić kao obična prijava i vratimo korisnika u app.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const cookieState = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value;
  const next = sigurniNext(jar.get("oauth_next")?.value);

  const neuspeh = () => {
    const res = NextResponse.redirect(new URL("/prijava?greska=google", base));
    res.cookies.delete("oauth_state");
    res.cookies.delete("oauth_verifier");
    res.cookies.delete("oauth_next");
    return res;
  };

  if (!pocketbaseConfigured()) return neuspeh();
  // Google je mogao vratiti grešku (korisnik odustao), ili state ne valja (CSRF).
  if (!code || !state || !verifier || state !== cookieState) return neuspeh();

  try {
    // Razmenu koda radimo kao SUPERUSER (pbAdmin): nov Google korisnik zahteva
    // kreiranje `users` zapisa, a Create pravilo je „Superusers only". Superuser
    // zaobilazi pravilo (vraća i dalje TOKEN KORISNICE, ne superusera), pa javna
    // direktna registracija preko API-ja ostaje blokirana — bez bezbednosnog ustupka.
    const admin = await pbAdmin();
    const redirectUrl = `${base}/api/oauth2/callback`;
    const authData = await admin
      .collection("users")
      .authWithOAuth2Code("google", code, verifier, redirectUrl);

    const rec = authData.record as unknown as {
      id: string;
      plan?: string;
      name?: string;
      email?: string;
      ime_biznisa?: string;
    };

    // Nov korisnik preko Google-a (bez plana) → free + trial, kao registracija.
    // authWithOAuth2Code je gore prepisao authStore na token KORISNICE, pa za
    // superuser izmenu uzimamo svež pbAdmin klijent.
    if (!rec.plan) {
      const d = new Date();
      d.setDate(d.getDate() + TRIAL_DANA);
      const trialDo = d.toISOString().slice(0, 10);
      const ime = (rec.ime_biznisa || rec.name || rec.email?.split("@")[0] || "Moj brend").trim();
      const admin2 = await pbAdmin();
      await admin2.collection("users").update(rec.id, {
        plan: "free",
        trial_do: trialDo,
        blokiran: false,
        emailVisibility: true,
        ...(rec.ime_biznisa ? {} : { ime_biznisa: ime }),
      });
    }

    const res = NextResponse.redirect(new URL(next, base));
    res.cookies.set(SESSION_COOKIE, authData.token, cookieOptions());
    res.cookies.set("rdk_checked", "1", { ...cookieOptions(), maxAge: 600 });
    res.cookies.delete("oauth_state");
    res.cookies.delete("oauth_verifier");
    res.cookies.delete("oauth_next");
    return res;
  } catch (e) {
    console.error("[oauth2/callback]", e);
    return neuspeh();
  }
}
