import { NextResponse } from "next/server";
import { getOrders } from "@/lib/data";
import { pbUserOrNull, pocketbaseConfigured } from "@/lib/pb/server";
import { danaDo, toISODate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!pocketbaseConfigured()) return NextResponse.json({ items: [] });
  if (!(await pbUserOrNull())) {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }

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
