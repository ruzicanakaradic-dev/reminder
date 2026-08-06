import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidToken } from "@/lib/auth";

// Štiti sve rute osim login-a, statike i push/cron API-ja.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await isValidToken(token);

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/prijava";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // izuzmi: login, api (cron/push imaju svoju zaštitu), _next, statiku, sw, manifest, ikonice
  matcher: [
    "/((?!prijava|api|_next/static|_next/image|favicon.ico|icon.png|logo.png|sw.js|manifest.webmanifest|icons|apple-touch-icon.png|offline).*)",
  ],
};
