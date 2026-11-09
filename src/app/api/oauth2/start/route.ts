import { NextResponse } from "next/server";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Javni (ne httpOnly) ne treba — state/verifier su privremeni i kratko žive.
const TMP = {
  httpOnly: true,
  sameSite: "lax" as const, // mora Lax da bi stigao nazad sa Google redirect-a
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600, // 10 min — dovoljno za jedan OAuth tok
};

function baseUrl(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}`;
}

function sigurniNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

// Start Google OAuth-a: tražimo authURL + state + codeVerifier od PocketBase-a,
// state/verifier čuvamo u httpOnly kolačićima, pa korisnika redirektujemo na
// Google. Bez realtime-a i bez popup-a — ceo tok je server-side.
export async function GET(req: Request) {
  const base = baseUrl(req);
  if (!pocketbaseConfigured()) {
    return NextResponse.redirect(new URL("/prijava?greska=google", base));
  }
  const next = sigurniNext(new URL(req.url).searchParams.get("next"));

  try {
    const pb = pbAnon();
    const methods = await pb.collection("users").listAuthMethods();
    const providers =
      (methods as unknown as { oauth2?: { providers?: Array<Record<string, string>> } })?.oauth2
        ?.providers ?? [];
    const g = providers.find((p) => p.name === "google");
    if (!g?.authURL || !g?.state || !g?.codeVerifier) {
      return NextResponse.redirect(new URL("/prijava?greska=google", base));
    }

    // redirect_uri MORA biti identičan onome u /callback i registrovan u Google-u.
    const redirectUrl = `${base}/api/oauth2/callback`;
    const res = NextResponse.redirect(g.authURL + redirectUrl);
    res.cookies.set("oauth_state", g.state, TMP);
    res.cookies.set("oauth_verifier", g.codeVerifier, TMP);
    res.cookies.set("oauth_next", next, TMP);
    return res;
  } catch (e) {
    console.error("[oauth2/start]", e);
    return NextResponse.redirect(new URL("/prijava?greska=google", base));
  }
}
