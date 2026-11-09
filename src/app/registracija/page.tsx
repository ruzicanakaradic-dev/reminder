"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff, Store, Sparkles } from "lucide-react";
import { TrustLogo } from "@/components/TrustLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegistracijaPage() {
  const router = useRouter();
  const [ime, setIme] = useState("");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/registracija", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ime_biznisa: ime, email, lozinka }),
      });
      if (res.ok) {
        // Auto-prijava je već postavila kolačić — ulazimo u aplikaciju.
        router.replace("/");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Registracija nije uspela.");
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
            Napravi nalog
          </div>

          <div
            className="flex items-center justify-center gap-1.5 text-sm font-semibold rounded-[10px] py-2"
            style={{ background: "var(--accent-100)", color: "var(--brand-plum)" }}
          >
            <Sparkles size={15} /> 5 dana besplatno · bez kartice
          </div>

          <div>
            <label className="label">Naziv biznisa</label>
            <div className="input-wrap">
              <Store size={18} className="input-icon input-icon-left" />
              <input
                type="text"
                value={ime}
                onChange={(e) => setIme(e.target.value)}
                className="input with-icon-left"
                placeholder="npr. Milkine torte"
                autoCapitalize="words"
                autoFocus
              />
            </div>
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
              />
            </div>
          </div>

          <div>
            <label className="label">Lozinka</label>
            <div className="input-wrap">
              <Lock size={18} className="input-icon input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                value={lozinka}
                onChange={(e) => setLozinka(e.target.value)}
                className="input with-icon-left with-icon-right"
                placeholder="Bar 8 znakova"
                autoComplete="new-password"
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

          {error && <div className="text-sm font-bold" style={{ color: "var(--brand-plum)" }}>{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            Počni besplatno
          </button>

          <p className="text-sm text-center text-muted">
            Već imaš nalog?{" "}
            <Link href="/prijava" className="font-bold" style={{ color: "var(--brand-plum)" }}>
              Prijavi se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
