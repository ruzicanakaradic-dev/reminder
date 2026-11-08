import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ClientResponseError } from "pocketbase";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Prijava: email + lozinka naloga iz PocketBase kolekcije `users`.
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
    const auth = await pb.collection("users").authWithPassword(email, password);
    (await cookies()).set(SESSION_COOKIE, auth.token, cookieOptions());
    // Upravo proveren token — middleware ne mora odmah ponovo da ga proverava.
    (await cookies()).set("rdk_checked", "1", { ...cookieOptions(), maxAge: 600 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 400) {
      return NextResponse.json({ error: "Pogrešan email ili lozinka." }, { status: 401 });
    }
    console.error("[prijava]", e);
    return NextResponse.json({ error: "Prijava trenutno ne radi. Pokušaj ponovo." }, { status: 502 });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete("rdk_checked");
  return NextResponse.json({ ok: true });
}
