import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, cookieOptions, isUsableUserToken, secondsUntilExpiry } from "@/lib/auth";

// Token proveravamo kod PocketBase-a najviše jednom u ovom intervalu
// (kolačić CHECK_COOKIE). Provera je ujedno i osvežavanje tokena:
//  - opozvan token (promenjena lozinka, obrisan nalog) → nazad na prijavu.
//    Bez ove provere PocketBase bi lažan/opozvan token tiho tretirao kao
//    gosta, pa bi korisnica videla praznu aplikaciju umesto prijave.
//  - ispravan token → dobija novi rok, pa aktivna korisnica nikad ne biva izbačena.
const CHECK_COOKIE = "rdk_checked";
const CHECK_EVERY_S = 60 * 10; // 10 minuta

function toLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/prijava";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(CHECK_COOKIE);
  return res;
}

// Štiti sve rute osim prijave, statike i API-ja (API rute same proveravaju prijavu).
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!isUsableUserToken(token)) return toLogin(req);

  const base = process.env.POCKETBASE_URL?.replace(/\/+$/, "");
  const recentlyChecked = req.cookies.get(CHECK_COOKIE)?.value === "1";
  // Pred sam istek proveri bez obzira na interval.
  const almostExpired = (secondsUntilExpiry(token) ?? 0) < CHECK_EVERY_S * 2;
  if (!base || (recentlyChecked && !almostExpired)) return NextResponse.next();

  try {
    const r = await fetch(`${base}/api/collections/users/auth-refresh`, {
      method: "POST",
      headers: { Authorization: token! },
    });
    if (r.status === 401 || r.status === 403 || r.status === 404) return toLogin(req);
    if (r.ok) {
      const { token: fresh } = (await r.json()) as { token?: string };
      const res = NextResponse.next();
      if (fresh) res.cookies.set(SESSION_COOKIE, fresh, cookieOptions());
      res.cookies.set(CHECK_COOKIE, "1", { ...cookieOptions(), maxAge: CHECK_EVERY_S });
      return res;
    }
  } catch {
    // PocketBase trenutno nedostupan — pusti dalje sa starim (još važećim) tokenom.
  }
  return NextResponse.next();
}

export const config = {
  // izuzmi: login, api (cron/push imaju svoju zaštitu), _next, statiku, sw, manifest, ikonice
  // izuzmi i /admin — admin ima svoj superuser gate (pbAdminSession),
  // ne koristi korisnički rdk_session kolačić.
  matcher: [
    "/((?!prijava|admin|api|_next/static|_next/image|favicon.ico|icon.png|logo.png|sw.js|manifest.webmanifest|icons|apple-touch-icon.png|offline).*)",
  ],
};
