import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidToken } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidToken(token))) {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }
  const res = await sendPushToAll({
    title: "🌹 Test podsetnik",
    body: "Ovako će izgledati podsetnik za isporuku. Zvuk + vibracija rade!",
    url: "/",
    tag: "test",
  });
  return NextResponse.json({ ok: true, ...res });
}
