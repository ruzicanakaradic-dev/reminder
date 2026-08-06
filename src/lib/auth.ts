// Jednostavna zaštita: jedna zajednička lozinka (APP_PASSWORD).
// Kolačić čuva token izveden iz lozinke — ne može se pogoditi bez nje.
// Koristi Web Crypto (radi i na Edge i u Node.js).

export const SESSION_COOKIE = "rdk_session";

export async function computeToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}::ruzini-kolaci-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return computeToken(pw);
}

export async function isValidToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedToken();
  if (!expected) return false;
  return token === expected;
}
