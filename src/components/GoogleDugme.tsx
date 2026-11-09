"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Loader2 } from "lucide-react";

// Zvanični Google „G" logo (multicolor).
function GoogleIkona() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

// Prijava/registracija preko Google naloga (SSO).
// Popup flow: PocketBase SDK otvori Google popup i koristi svoj
// /api/oauth2-redirect endpoint (isti koji je registrovan u Google-u), pa
// radi sa svakog domena — i preview i produkcija. Posle uspeha PB token
// šaljemo našoj /api/oauth2 ruti koja ga pretvara u httpOnly kolačić.
export function GoogleDugme({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [pbUrl, setPbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adresa PB servera nije tajna (browser ionako priča sa njom) — čitamo je
  // sa /api/oauth2 da ne moramo NEXT_PUBLIC env (koji se ranije kvario u prod).
  useEffect(() => {
    let živ = true;
    fetch("/api/oauth2")
      .then((r) => r.json())
      .then((d) => {
        if (živ && d?.enabled && typeof d?.pbUrl === "string") setPbUrl(d.pbUrl);
      })
      .catch(() => {});
    return () => {
      živ = false;
    };
  }, []);

  async function onClick() {
    if (!pbUrl || loading) return;
    setError(null);
    setLoading(true);
    try {
      const pb = new PocketBase(pbUrl);
      const authData = await pb.collection("users").authWithOAuth2({ provider: "google" });
      const res = await fetch("/api/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authData.token }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Google prijava nije uspela.");
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      // Korisnik zatvorio/otkazao popup → ne prikazuj grešku. Ostalo prikaži.
      const msg = e instanceof Error ? e.message : "";
      if (!/cancel|closed|popup|aborted/i.test(msg)) {
        setError(msg || "Google prijava nije uspela. Pokušaj ponovo.");
      }
    } finally {
      setLoading(false);
    }
  }

  // SSO nije konfigurisan (nema PB URL) → ne prikazuj dugme uopšte.
  if (!pbUrl) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="btn btn-secondary btn-block"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIkona />}
        Nastavi sa Google
      </button>
      {error && (
        <div className="text-sm font-bold" style={{ color: "var(--brand-plum)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
