import { NextResponse } from "next/server";
import { ClientResponseError } from "pocketbase";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Potvrda reseta: token iz mejla + nova lozinka → PocketBase postavlja lozinku.
// admin=true → superuser (_superusers), inače korisnica (users).
export async function POST(req: Request) {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ error: "Server nije povezan sa bazom." }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "").trim();
  const lozinka = String(body?.lozinka ?? "");
  const admin = body?.admin === true;
  if (!token) return NextResponse.json({ error: "Link nije važeći." }, { status: 400 });
  if (lozinka.length < 8) {
    return NextResponse.json({ error: "Lozinka mora imati bar 8 znakova." }, { status: 400 });
  }

  try {
    const pb = pbAnon();
    await pb.collection(admin ? "_superusers" : "users").confirmPasswordReset(token, lozinka, lozinka);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClientResponseError && e.status === 400) {
      return NextResponse.json(
        { error: "Link je istekao ili je već iskorišćen. Zatraži novi." },
        { status: 400 }
      );
    }
    console.error("[lozinka/reset]", e);
    return NextResponse.json({ error: "Reset trenutno ne radi. Pokušaj ponovo." }, { status: 502 });
  }
}
