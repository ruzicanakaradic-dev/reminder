"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { TrustLogo } from "@/components/TrustLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

function PrijavaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/prijava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Prijava nije uspela.");
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

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div className="kicker text-center" style={{ color: "var(--brand-plum)" }}>
            Prijava
          </div>
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
              />
            </div>
          </div>
          <div>
            <label className="label">Lozinka</label>
            <div className="input-wrap">
              <Lock size={18} className="input-icon input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input with-icon-left with-icon-right"
                placeholder="Unesi lozinku"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-[8px] text-[var(--neutral-600)] hover:text-[var(--brand-plum)]"
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="text-right -mt-1">
            <Link
              href="/prijava/zaboravljena"
              className="text-sm font-semibold"
              style={{ color: "var(--brand-plum)" }}
            >
              Zaboravljena lozinka?
            </Link>
          </div>

          {error && <div className="text-sm font-bold" style={{ color: "var(--brand-plum)" }}>{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            Uđi
          </button>

          <p className="text-sm text-center text-muted">
            Nemaš nalog?{" "}
            <Link href="/registracija" className="font-bold" style={{ color: "var(--brand-plum)" }}>
              Napravi besplatno
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function PrijavaPage() {
  return (
    <Suspense fallback={null}>
      <PrijavaForm />
    </Suspense>
  );
}
