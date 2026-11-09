"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, ArrowLeft, MailCheck } from "lucide-react";
import { TrustLogo } from "@/components/TrustLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

function ZaboravljenaForm() {
  const params = useSearchParams();
  const admin = params.get("admin") === "1";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [poslato, setPoslato] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nazadHref = admin ? "/admin/prijava" : "/prijava";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lozinka/zahtev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, admin }),
      });
      if (res.ok) {
        setPoslato(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Nešto nije u redu. Pokušaj ponovo.");
      }
    } catch {
      setError("Greška u vezi. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <TrustLogo markSize={60} />
        </div>

        {poslato ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <MailCheck size={40} style={{ color: "var(--brand-plum)" }} />
            </div>
            <div className="text-ink font-semibold text-lg">Proveri mejl</div>
            <p className="text-sm text-muted">
              Ako postoji nalog sa adresom <b>{email}</b>, poslali smo link za postavljanje nove lozinke.
              Proveri i spam folder.
            </p>
            <Link href={nazadHref} className="btn btn-secondary btn-block">
              <ArrowLeft size={18} /> Nazad na prijavu
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-6 space-y-4">
            <div className="kicker text-center" style={{ color: "var(--brand-plum)" }}>
              Zaboravljena lozinka
            </div>
            <p className="text-sm text-muted text-center -mt-1">
              Unesi email naloga i poslaćemo ti link za novu lozinku.
            </p>
            <div>
              <label className="label">Email</label>
              <div className="input-wrap">
                <Mail size={18} className="input-icon input-icon-left" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input with-icon-left"
                  placeholder="tvoj@email.com"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && <div className="text-sm font-bold" style={{ color: "var(--brand-plum)" }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Pošalji link
            </button>

            <Link href={nazadHref} className="text-sm text-center text-muted flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Nazad na prijavu
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ZaboravljenaPage() {
  return (
    <Suspense fallback={null}>
      <ZaboravljenaForm />
    </Suspense>
  );
}
