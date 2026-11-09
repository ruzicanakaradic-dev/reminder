import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";
import { registrujNalog } from "@/lib/signup";
import { KorisnickaGreska } from "@/lib/greske";

export const dynamic = "force-dynamic";

// Javna registracija + automatska prijava odmah posle nje.
export async function POST(req: Request) {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ error: "Server nije povezan sa bazom (POCKETBASE_URL)." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const ime_biznisa = String(body?.ime_biznisa ?? "");
  const email = String(body?.email ?? "").trim().toLowerCase();
  const lozinka = String(body?.lozinka ?? body?.password ?? "");

  try {
    await registrujNalog({ ime_biznisa, email, lozinka });

    // Auto-login: isti kolačić kao /api/prijava, pa korisnica odmah ulazi.
    const pb = pbAnon();
    const auth = await pb.collection("users").authWithPassword(email, lozinka);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, auth.token, cookieOptions());
    jar.set("rdk_checked", "1", { ...cookieOptions(), maxAge: 600 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof KorisnickaGreska) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[registracija]", e);
    return NextResponse.json({ error: "Registracija trenutno ne radi. Pokušaj ponovo." }, { status: 502 });
  }
}
