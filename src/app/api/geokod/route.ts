import { NextResponse } from "next/server";

// Geokodiranje adrese polazišta (podešavanja korisnice) → koordinate.
// Isti besplatni Nominatim (OpenStreetMap) kao /api/rastojanje, bez ključa.
// Koristi se samo da korisnica ne mora ručno da traži lat/lon svog polazišta.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "rdk-reminder/1.0 (Ruzini domaci kolaci - dnevnik porudzbina)";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "Nedostaje adresa." }, { status: 400 });

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=rs&addressdetails=0&q=" +
      encodeURIComponent(`${q}, Srbija`);
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "sr" } });
    if (!r.ok) return NextResponse.json({ error: "Geokodiranje nije uspelo." }, { status: 502 });
    const arr = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!arr.length) return NextResponse.json({ error: "Adresa nije pronađena." }, { status: 404 });
    const hit = arr[0];
    return NextResponse.json({
      lat: parseFloat(hit.lat),
      lon: parseFloat(hit.lon),
      naziv: hit.display_name,
    });
  } catch (e) {
    console.error("[geokod] greška:", e);
    return NextResponse.json({ error: "Greška pri geokodiranju." }, { status: 502 });
  }
}
