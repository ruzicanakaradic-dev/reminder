import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push";
import { danaDo, formatDatum, toISODate } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Poziva ga Vercel Cron jednom dnevno (vidi vercel.json).
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
  const today = new Date();
  const to = new Date();
  to.setDate(today.getDate() + 2);

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .neq("status", "isporuceno")
    .lte("datum_isporuke", toISODate(to));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []) as Order[];
  let poslato = 0;

  for (const o of orders) {
    const dana = danaDo(o.datum_isporuke);
    let posalji = false;
    const patch: Partial<Order> = {};

    if (dana === 2 && !o.reminded_2d) {
      posalji = true;
      patch.reminded_2d = true;
    } else if (dana === 1 && !o.reminded_1d) {
      posalji = true;
      patch.reminded_1d = true;
    }

    if (!posalji) continue;

    const kada = dana === 2 ? "za 2 dana" : "sutra";
    await sendPushToAll({
      title: `🌹 Isporuka ${kada}: ${o.kupac_ime}`,
      body: `${o.proizvod}${o.grad ? " · " + o.grad : ""} — ${formatDatum(o.datum_isporuke)}`,
      url: `/porudzbine/${o.id}`,
      tag: `order-${o.id}-${dana}`,
    });
    await sb.from("orders").update(patch).eq("id", o.id);
    poslato++;
  }

  return NextResponse.json({ ok: true, provereno: orders.length, poslato });
}
