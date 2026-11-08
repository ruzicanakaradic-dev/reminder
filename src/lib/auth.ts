// Prijava: svaka korisnica ima svoj nalog u PocketBase-u (kolekcija `users`).
// Kolačić čuva PocketBase auth token (JWT). Potpis tokena proverava PocketBase
// pri svakom upitu; ovde samo čitamo rok važenja i id korisnice.
// Bez Node API-ja — radi i u middleware-u (Edge) i na serveru.

export const SESSION_COOKIE = "rdk_session";
// Admin konzola: zaseban kolačić sa PocketBase SUPERUSER tokenom (ne meša se
// sa korisničkim rdk_session). Samo Igor, sa superuser kredencijalima.
export const ADMIN_COOKIE = "rdk_admin";

// Koliko dugo kolačić živi u browseru (token se osvežava pre isteka).
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 dana

type TokenPayload = { id?: string; exp?: number; type?: string; collectionId?: string };

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return atob(b64);
}

export function decodeToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as TokenPayload;
  } catch {
    return null;
  }
}

// Sekunde do isteka tokena (negativno = istekao). null = neispravan token.
export function secondsUntilExpiry(token: string | undefined | null): number | null {
  const p = decodeToken(token);
  if (!p?.exp) return null;
  return p.exp - Math.floor(Date.now() / 1000);
}

// Token korisnice (ne superusera), sa id-jem i neistekao.
export function isUsableUserToken(token: string | undefined | null): boolean {
  const p = decodeToken(token);
  if (!p?.id || p.type !== "auth") return false;
  const left = secondsUntilExpiry(token);
  return left != null && left > 0;
}

// Superuser (admin) token: neistekao, tipa auth. Potpis i kolekciju pravu
// proveru radi PocketBase pri svakom pozivu; ovde samo rok i oblik.
export function isUsableAdminToken(token: string | undefined | null): boolean {
  const p = decodeToken(token);
  if (!p?.id || p.type !== "auth") return false;
  const left = secondsUntilExpiry(token);
  return left != null && left > 0;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}
