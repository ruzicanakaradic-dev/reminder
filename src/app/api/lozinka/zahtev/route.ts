import { NextResponse } from "next/server";
import { pbAnon, pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Zahtev za reset lozinke. PocketBase šalje mejl sa linkom. UVEK vraća 200 —
// ne odajemo da li email postoji (zaštita od popisivanja naloga).
// admin=true → reset za superuser (_superusers), inače korisnica (users).
export async function POST(req: Request) {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ error: "Server nije povezan sa bazom." }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const admin = body?.admin === true;
  if (!email) return NextResponse.json({ error: "Unesi email." }, { status: 400 });

  try {
    const pb = pbAnon();
    await pb.collection(admin ? "_superusers" : "users").requestPasswordReset(email);
  } catch (e) {
    // Ne otkrivamo postojanje naloga; tiho logujemo.
    console.error("[lozinka/zahtev]", e);
  }
  return NextResponse.json({ ok: true });
}
