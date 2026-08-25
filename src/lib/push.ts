import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!priv) throw new Error("Nedostaje VAPID_PRIVATE_KEY u env-u.");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

// Javni ključ je uvek prisutan (konstanta). Za slanje treba samo privatni ključ iz env-a.
export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Pošalji notifikaciju svim pretplaćenim uređajima
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; removed: number; total: number }> {
  ensureConfigured();
  const sb = supabaseAdmin();
  const { data: subs, error } = await sb.from("push_subscriptions").select("*");
  if (error) throw error;

  const total = subs?.length ?? 0;
  let sent = 0;
  let removed = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      const subscription = {
        endpoint: s.endpoint as string,
        keys: { p256dh: s.p256dh as string, auth: s.auth as string },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 = pretplata više ne važi → obriši
        if (code === 404 || code === 410) {
          await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          removed++;
        }
      }
    })
  );

  return { sent, removed, total };
}
