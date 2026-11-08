import { NextResponse } from "next/server";
import { pbUserVerified } from "@/lib/pb/server";
import { savePushSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await pbUserVerified();
  if (!ctx) return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });

  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Neispravna pretplata" }, { status: 400 });
  }

  try {
    await savePushSubscription(ctx.userId, {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Greška" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
