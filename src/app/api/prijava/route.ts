import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, computeToken, expectedToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = await expectedToken();

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD nije podešen na serveru." },
      { status: 500 }
    );
  }

  const token = await computeToken(String(password ?? ""));
  if (token !== expected) {
    return NextResponse.json({ error: "Pogrešna lozinka." }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 dana
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
