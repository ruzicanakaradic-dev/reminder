import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { pbAnon, pbAdmin, pbUrl, pocketbaseConfigured } from "@/lib/pb/server";
import { TRIAL_DANA } from "@/lib/signup";

export const dynamic = "force-dynamic";

// GET: konfiguracija za klijentski OAuth popup. Adresa PB servera nije tajna
// (browser ionako priča sa njom), pa je šaljemo klijentu da ne moramo
// NEXT_PUBLIC env promenljivu. Bez POCKETBASE_URL → SSO isključen.
export async function GET() {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ enabled: true, pbUrl: pbUrl() });
}

// POST: klijent je završio Google OAuth popup i šalje PB token korisnice.
// Token se NE prihvata na reč — proveravamo ga kod PocketBase-a (authRefresh).
// Nov SSO nalog (još nema `plan`) → inicijalizujemo ga kao kod registracije:
// plan=free + trial_do (+5 dana) + ime_biznisa iz Google imena. Tek onda
// postavljamo isti httpOnly kolačić kao obična prijava.
export async function POST(req: Request) {
  if (!pocketbaseConfigured()) {
    return NextResponse.json({ error: "Server nije povezan sa bazom." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  if (!token) {
    return NextResponse.json({ error: "Nedostaje token." }, { status: 400 });
  }

  try {
    const pb = pbAnon();
    pb.authStore.save(token, null);
    // Proveri potpis i da nalog postoji; vrati merodavan zapis + svež token.
    const auth = await pb.collection("users").authRefresh();
    const rec = auth.record as unknown as {
      id: string;
      plan?: string;
      name?: string;
      email?: string;
      ime_biznisa?: string;
    };

    // Nov korisnik preko Google-a nema postavljen plan → daj mu free + trial,
    // isto kao što radi javna registracija (signup.ts). Postojeći (free/paid)
    // se preskače — ne diramo mu plan ni trial.
    if (!rec.plan) {
      const d = new Date();
      d.setDate(d.getDate() + TRIAL_DANA);
      const trialDo = d.toISOString().slice(0, 10);
      const ime = (rec.ime_biznisa || rec.name || rec.email?.split("@")[0] || "Moj brend").trim();
      const admin = await pbAdmin();
      await admin.collection("users").update(rec.id, {
        plan: "free",
        trial_do: trialDo,
        blokiran: false,
        emailVisibility: true,
        // ime_biznisa postavi samo ako ga još nema (da ne pregazimo uneto).
        ...(rec.ime_biznisa ? {} : { ime_biznisa: ime }),
      });
    }

    // Izmena polja ne menja tokenKey, pa `auth.token` ostaje važeći.
    const jar = await cookies();
    jar.set(SESSION_COOKIE, auth.token, cookieOptions());
    jar.set("rdk_checked", "1", { ...cookieOptions(), maxAge: 600 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[oauth2]", e);
    return NextResponse.json(
      { error: "Google prijava nije uspela. Pokušaj ponovo." },
      { status: 401 }
    );
  }
}
