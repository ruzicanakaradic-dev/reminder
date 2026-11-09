"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { TrustLogo } from "@/components/TrustLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const admin = params.get("admin") === "1";
  const nazadHref = admin ? "/admin/prijava" : "/prijava";

  const [lozinka, setLozinka] = useState("");
  const [potvrda, setPotvrda] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gotovo, setGotovo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (lozinka.length < 8) {
      setError("Lozinka mora imati bar 8 znakova.");
      return;
    }
    if (lozinka !== potvrda) {
      setError("Lozinke se ne poklapaju.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lozinka/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lozinka, admin }),
      });
      if (res.ok) {
        setGotovo(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Reset nije uspeo. Pokušaj ponovo.");
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

        {gotovo ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 size={40} style={{ color: "var(--brand-plum)" }} />
            </div>
            <div className="text-ink font-semibold text-lg">Lozinka je postavljena</div>
            <p className="text-sm text-muted">Sada se možeš prijaviti novom lozinkom.</p>
            <Link href={nazadHref} className="btn btn-primary btn-block">
              Idi na prijavu
            </Link>
          </div>
        ) : !token ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="text-ink font-semibold text-lg">Link nije važeći</div>
            <p className="text-sm text-muted">
              Link za reset je nepotpun ili je istekao. Zatraži novi.
            </p>
            <Link
              href={admin ? "/prijava/zaboravljena?admin=1" : "/prijava/zaboravljena"}
              className="btn btn-primary btn-block"
            >
              Zatraži novi link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-6 space-y-4">
            <div className="kicker text-center" style={{ color: "var(--brand-plum)" }}>
              Nova lozinka
            </div>
            <div>
              <label className="label">Nova lozinka</label>
              <div className="input-wrap">
                <Lock size={18} className="input-icon input-icon-left" />
                <input
                  type={show ? "text" : "password"}
                  value={lozinka}
                  onChange={(e) => setLozinka(e.target.value)}
                  className="input with-icon-left with-icon-right"
                  placeholder="Bar 8 znakova"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-[8px] text-[var(--neutral-600)] hover:text-[var(--brand-plum)]"
                  aria-label={show ? "Sakrij lozinku" : "Prikaži lozinku"}
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Potvrdi lozinku</label>
              <div className="input-wrap">
                <Lock size={18} className="input-icon input-icon-left" />
                <input
                  type={show ? "text" : "password"}
                  value={potvrda}
                  onChange={(e) => setPotvrda(e.target.value)}
                  className="input with-icon-left"
                  placeholder="Ponovi lozinku"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <div className="text-sm font-bold" style={{ color: "var(--brand-plum)" }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Sačuvaj lozinku
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

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
