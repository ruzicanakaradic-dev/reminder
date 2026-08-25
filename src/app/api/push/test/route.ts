import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidToken } from "@/lib/auth";
import { sendPushToAll, isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidToken(token))) {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }

  // VAPID ključevi ne postoje na serveru (npr. nisu dodati u Vercel produkciju)
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        reason:
          "Server nema VAPID_PRIVATE_KEY u env-u. Push se ne može poslati sa servera.",
      },
      { status: 200 }
    );
  }

  try {
    const res = await sendPushToAll({
      title: "🌹 Test podsetnik",
      body: "Ako ovo vidiš na zaključanom ekranu — push radi! 🎉",
      url: "/",
      tag: "test",
    });
    return NextResponse.json({ ok: true, configured: true, ...res });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        reason: err instanceof Error ? err.message : "Greška pri slanju push notifikacije.",
      },
      { status: 200 }
    );
  }
}
