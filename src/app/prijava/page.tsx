"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

function PrijavaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
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
        body: JSON.stringify({ password }),
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ružini domaći kolači" className="mx-auto w-44 rounded-[16px]" />
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div className="kicker text-center" style={{ color: "var(--accent)" }}>
            Knjiga porudžbina
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
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-[8px] text-[var(--neutral-600)] hover:text-[var(--accent)]"
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            Uđi
          </button>
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
