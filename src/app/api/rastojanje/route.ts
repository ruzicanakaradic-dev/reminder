import { NextResponse } from "next/server";
import { POLAZISTE } from "@/lib/transport";
import { autoPutarinaSmer } from "@/lib/putarina";
import { getSettings } from "@/lib/data";

// Automatsko računanje vozačke kilometraže od POLAZIŠTA korisnice do unete
// adrese isporuke — potpuno besplatno, bez API ključa:
//   1) Nominatim (OpenStreetMap) geokodira adresu → koordinate
//   2) OSRM (public server) računa vozačku rutu → rastojanje u metrima
//   3) Auto-putarina iz tabele naplatnih stanica (putarina.ts)
//
// Polazište dolazi iz podešavanja korisnice (app_settings); ako nije
// geokodirano, pada na Ružicin fallback (Inđija) da app ne pukne.
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
  { km: number; jednosmerno: number; putarina: number; proveriPutarinu: boolean; naziv: string }
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

  // Polazište korisnice (iz podešavanja); fallback na Ružicin POLAZISTE.
  let polaziste: Coord = { lat: POLAZISTE.lat, lon: POLAZISTE.lon };
  try {
    const st = await getSettings();
    if (st.polaziste_lat && st.polaziste_lon) {
      polaziste = { lat: st.polaziste_lat, lon: st.polaziste_lon };
    }
  } catch {
    // Bez prijavljene korisnice (ili greška) → ostaje fallback polazište.
  }

  // Keš ključ uključuje polazište — različite korisnice imaju različit rezultat.
  const q = [adresa, grad, "Srbija"].filter(Boolean).join(", ");
  const key = `${polaziste.lat.toFixed(4)},${polaziste.lon.toFixed(4)}|${q.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json({ ...cached, cache: true });

  try {
    // Pokušaj sa punom adresom; ako ne uspe, padni na samo grad.
    let geo = await geokodiraj(q);
    if (!geo && adresa && grad) geo = await geokodiraj(`${grad}, Srbija`);
    if (!geo) {
      return NextResponse.json({ error: "Adresa nije pronađena." }, { status: 404 });
    }

    const jednosmerno = await rutaKm(polaziste, geo.coord);
    if (jednosmerno == null) {
      return NextResponse.json({ error: "Ruta nije dostupna." }, { status: 502 });
    }

    const km = Math.round(jednosmerno) * 2; // povratno
    // Auto-putarina iz tabele naplatnih stanica: jedan smer × 2 (povratno).
    const p = autoPutarinaSmer(polaziste.lat, polaziste.lon, geo.coord.lat, geo.coord.lon);
    const putarina = p.smer * 2;
    const out = {
      km,
      jednosmerno: Number(jednosmerno.toFixed(1)),
      putarina,
      proveriPutarinu: p.proveri,
      naziv: geo.naziv,
    };
    cache.set(key, out);
    return NextResponse.json(out);
  } catch (e) {
    console.error("[rastojanje] fetch greška:", e);
    return NextResponse.json({ error: "Greška pri računanju rastojanja." }, { status: 502 });
  }
}
