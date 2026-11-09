import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ClientResponseError } from "pocketbase";
import { ADMIN_COOKIE, cookieOptions } from "@/lib/auth";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Admin prijava: PocketBase SUPERUSER (kolekcija _superusers). Samo Igor.
// Token ide u zaseban kolačić rdk_admin (ne meša se sa korisničkim).
export async function POST(req: Request) {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ error: "Server nije povezan sa bazom (POCKETBASE_URL)." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Unesi email i lozinku." }, { status: 400 });
  }

  try {
    const pb = pbAnon();
    const auth = await pb.collection("_superusers").authWithPassword(email, password);
    // Admin kolačić ima kraći vek od korisničkog (administracija, ne svakodnevni rad).
    (await cookies()).set(ADMIN_COOKIE, auth.token, { ...cookieOptions(), maxAge: 60 * 60 * 12 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 400) {
      return NextResponse.json({ error: "Pogrešan email ili lozinka." }, { status: 401 });
    }
    console.error("[admin/prijava]", e);
    return NextResponse.json({ error: "Prijava trenutno ne radi. Pokušaj ponovo." }, { status: 502 });
  }
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
