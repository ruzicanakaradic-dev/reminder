import "server-only";
import webpush from "web-push";
import { pbAdmin } from "@/lib/pb/server";
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

// Pošalji notifikaciju na sve uređaje JEDNE korisnice (vlasnice porudžbine).
// Radi preko superuser klijenta jer ga poziva i cron (bez prijave).
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number; total: number }> {
  ensureConfigured();
  const pb = await pbAdmin();
  const subs = await pb.collection("push_subscriptions").getFullList({
    filter: pb.filter("user = {:uid}", { uid: userId }),
  });

  const total = subs.length;
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
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
          await pb.collection("push_subscriptions").delete(s.id);
          removed++;
        }
      }
    })
  );

  return { sent, removed, total };
}

// Sačuvaj pretplatu uređaja za korisnicu. Ako je isti uređaj ranije bio
// prijavljen na drugi nalog, pretplata prelazi na trenutnu korisnicu.
export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string }
): Promise<void> {
  const pb = await pbAdmin();
  const existing = await pb.collection("push_subscriptions").getFullList({
    filter: pb.filter("endpoint = {:e}", { e: sub.endpoint }),
    fields: "id",
  });
  if (existing[0]) {
    await pb.collection("push_subscriptions").update(existing[0].id, { ...sub, user: userId });
  } else {
    await pb.collection("push_subscriptions").create({ ...sub, user: userId });
  }
}
