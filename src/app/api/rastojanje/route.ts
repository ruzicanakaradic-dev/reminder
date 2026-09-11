import { NextResponse } from "next/server";
import { POLAZISTE, procenaPutarinaSmer } from "@/lib/transport";

// Automatsko računanje vozačke kilometraže od POLAZIŠTA (Inđija, Jug Bogdana 17)
// do unete adrese isporuke — potpuno besplatno, bez API ključa:
//   1) Nominatim (OpenStreetMap) geokodira adresu → koordinate
//   2) OSRM (public server) računa vozačku rutu → rastojanje u metrima
//
// Rezultat je POVRATNA kilometraža (jednosmerno × 2), zaokružena na ceo km,
// spremna da uđe u obracunajTransport() u formi.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nominatim traži opisni User-Agent (identifikacija aplikacije).
const UA = "rdk-reminder/1.0 (Ruzini domaci kolaci - dnevnik porudzbina)";

// Prosta memorijska keš tabela (po instanci servera) — da ne gnjavimo Nominatim
// istim upitom pri sitnim izmenama forme.
const cache = new Map<
  string,
  { km: number; jednosmerno: number; putarina: number; naziv: string }
>();

type Coord = { lat: number; lon: number };

async function geokodiraj(q: string): Promise<{ coord: Coord; naziv: string } | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=rs&addressdetails=0&q=" +
    encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "sr" } });
  if (!r.ok) return null;
  const arr = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!arr.length) return null;
  const hit = arr[0];
  return {
    coord: { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) },
    naziv: hit.display_name,
  };
}

async function rutaKm(from: Coord, to: Coord): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const j = (await r.json()) as { code: string; routes?: Array<{ distance: number }> };
  if (j.code !== "Ok" || !j.routes?.length) return null;
  return j.routes[0].distance / 1000; // metri → km (jednosmerno)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grad = (searchParams.get("grad") ?? "").trim();
  const adresa = (searchParams.get("adresa") ?? "").trim();
  if (!grad && !adresa) {
    return NextResponse.json({ error: "Nedostaje adresa." }, { status: 400 });
  }

  // Sastavi upit: adresa + grad + Srbija (za precizniji pogodak).
  const q = [adresa, grad, "Srbija"].filter(Boolean).join(", ");
  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached) return NextResponse.json({ ...cached, cache: true });

  try {
    // Pokušaj sa punom adresom; ako ne uspe, padni na samo grad.
    let geo = await geokodiraj(q);
    if (!geo && adresa && grad) geo = await geokodiraj(`${grad}, Srbija`);
    if (!geo) {
      return NextResponse.json({ error: "Adresa nije pronađena." }, { status: 404 });
    }

    const jednosmerno = await rutaKm(POLAZISTE, geo.coord);
    if (jednosmerno == null) {
      return NextResponse.json({ error: "Ruta nije dostupna." }, { status: 502 });
    }

    const km = Math.round(jednosmerno) * 2; // povratno
    // Procena putarine: jedan smer iz koordinata × 2 (povratno).
    const putarina = procenaPutarinaSmer(geo.coord.lat, geo.coord.lon) * 2;
    const out = { km, jednosmerno: Number(jednosmerno.toFixed(1)), putarina, naziv: geo.naziv };
    cache.set(key, out);
    return NextResponse.json(out);
  } catch (e) {
    console.error("[rastojanje] fetch greška:", e);
    return NextResponse.json({ error: "Greška pri računanju rastojanja." }, { status: 502 });
  }
}
