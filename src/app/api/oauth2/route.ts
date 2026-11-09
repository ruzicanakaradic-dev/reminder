import { NextResponse } from "next/server";
import { pocketbaseConfigured } from "@/lib/pb/server";

export const dynamic = "force-dynamic";

// Da li je Google SSO dostupan (ima POCKETBASE_URL). Klijentsko dugme ga čita
// da zna da li da se prikaže. Sam OAuth tok ide preko /api/oauth2/start i
// /api/oauth2/callback (server-side redirect, bez realtime-a).
export async function GET() {
  return NextResponse.json({ enabled: pocketbaseConfigured() });
}
