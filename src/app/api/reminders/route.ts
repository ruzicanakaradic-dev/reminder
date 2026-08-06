import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidToken } from "@/lib/auth";
import { getOrders } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { danaDo, toISODate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidToken(token))) {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }

  if (!supabaseConfigured()) return NextResponse.json({ items: [] });

  const today = new Date();
  const to = new Date();
  to.setDate(today.getDate() + 2);

  // sve aktivne (nisu isporučene) sa isporukom do +2 dana (uključujući zakasnele)
  const orders = await getOrders({ to: toISODate(to) });

  const items = orders
    .filter((o) => o.status !== "isporuceno")
    .map((o) => ({
      id: o.id,
      redni_broj: o.redni_broj,
      kupac_ime: o.kupac_ime,
      proizvod: o.proizvod,
      grad: o.grad,
      adresa: o.adresa,
      datum_isporuke: o.datum_isporuke,
      status: o.status,
      dana: danaDo(o.datum_isporuke),
    }))
    .sort((a, b) => a.dana - b.dana);

  return NextResponse.json({ items });
}
