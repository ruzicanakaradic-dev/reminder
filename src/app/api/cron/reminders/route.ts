import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push";
import { formatDatum } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

const TZ = "Europe/Belgrade";

// Delovi lokalnog (beogradskog) vremena za dati instant
function belgradeParts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(date)) p[part.type] = part.value;
  return {
    y: +p.year,
    mo: +p.month,
    d: +p.day,
    h: +(p.hour === "24" ? "0" : p.hour),
    mi: +p.minute,
  };
}

// Instant (UTC) za beogradsko "zidno" vreme (datum + HH:MM), uz ispravan DST
function belgradeInstant(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = belgradeParts(new Date(guess));
  const localAsUTC = Date.UTC(parts.y, parts.mo - 1, parts.d, parts.h, parts.mi);
  const offset = localAsUTC - guess; // koliko je Beograd ispred UTC (ms)
  return new Date(guess - offset);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Poziva ga Vercel Cron (dnevno) i GitHub Actions (na ~30 min — za podsetnik 2h pre).
// Zaštita: Authorization: Bearer <CRON_SECRET>  ili  ?secret=<CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  const provided = auth?.replace("Bearer ", "") || url.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const now = new Date();
  const bnow = belgradeParts(now);
  const localHour = bnow.h;
  const todayUTC = Date.UTC(bnow.y, bnow.mo - 1, bnow.d);

  // Gornja granica upita: danas + 2 dana (dovoljno za sve podsetnike)
  const upper = new Date(todayUTC + 2 * 86400000);
  const upperStr = `${upper.getUTCFullYear()}-${pad(upper.getUTCMonth() + 1)}-${pad(upper.getUTCDate())}`;

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .neq("status", "isporuceno")
    .lte("datum_isporuke", upperStr);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []) as Order[];
  let poslato = 0;

  for (const o of orders) {
    const [dy, dmo, dd] = o.datum_isporuke.split("-").map(Number);
    const delUTC = Date.UTC(dy, dmo - 1, dd);
    const dana = Math.round((delUTC - todayUTC) / 86400000);

    const patch: Partial<Order> = {};
    const vremeSuffix = o.vreme_isporuke ? ` u ${o.vreme_isporuke}` : "";

    // ── Podsetnici po danu — šalju se ujutru (od 07:00 po beogradskom vremenu) ──
    if (localHour >= 7) {
      if (dana === 2 && !o.reminded_2d) {
        await sendPushToAll({
          title: `🌹 Isporuka za 2 dana: ${o.kupac_ime}`,
          body: `${o.proizvod}${o.grad ? " · " + o.grad : ""} — ${formatDatum(o.datum_isporuke)}${vremeSuffix}`,
          url: `/porudzbine/${o.id}`,
          tag: `order-${o.id}-2d`,
        });
        patch.reminded_2d = true;
        poslato++;
      } else if (dana === 1 && !o.reminded_1d) {
        await sendPushToAll({
          title: `🌹 Isporuka sutra: ${o.kupac_ime}`,
          body: `${o.proizvod}${o.grad ? " · " + o.grad : ""} — ${formatDatum(o.datum_isporuke)}${vremeSuffix}`,
          url: `/porudzbine/${o.id}`,
          tag: `order-${o.id}-1d`,
        });
        patch.reminded_1d = true;
        poslato++;
      } else if (dana === 0 && !o.reminded_0d) {
        await sendPushToAll({
          title: `🌹 Isporuka DANAS: ${o.kupac_ime}`,
          body: `${o.proizvod}${o.grad ? " · " + o.grad : ""}${vremeSuffix}`,
          url: `/porudzbine/${o.id}`,
          tag: `order-${o.id}-0d`,
        });
        patch.reminded_0d = true;
        poslato++;
      }
    }

    // ── Podsetnik 2 sata pre isporuke (traži uneto vreme isporuke) ──
    if (dana === 0 && o.vreme_isporuke && !o.reminded_2h) {
      const del = belgradeInstant(o.datum_isporuke, o.vreme_isporuke);
      const minutesUntil = (del.getTime() - now.getTime()) / 60000;
      // Okini kad je do isporuke ostalo 2h ili manje (ali još nije prošlo)
      if (minutesUntil > 0 && minutesUntil <= 120) {
        await sendPushToAll({
          title: `⏰ Isporuka za ~2 sata: ${o.kupac_ime}`,
          body: `${o.proizvod}${o.grad ? " · " + o.grad : ""} — danas u ${o.vreme_isporuke}`,
          url: `/porudzbine/${o.id}`,
          tag: `order-${o.id}-2h`,
        });
        patch.reminded_2h = true;
        poslato++;
      }
    }

    if (Object.keys(patch).length > 0) {
      await sb.from("orders").update(patch).eq("id", o.id);
    }
  }

  return NextResponse.json({ ok: true, provereno: orders.length, poslato, localHour });
}
