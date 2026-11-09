"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";

// Admin prijava — PocketBase superuser. Odvojeno od korisničke prijave.
export default function AdminPrijavaPage() {
  const router = useRouter();
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
      const res = await fetch("/api/admin/prijava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/admin");
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
        <div className="text-center mb-6 flex flex-col items-center gap-2">
          <ShieldCheck size={36} className="text-[var(--brand-plum)]" />
          <div className="text-ink font-semibold text-lg">Admin konzola</div>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div className="kicker text-center" style={{ color: "var(--brand-plum)" }}>
            Upravljanje korisnicama
          </div>
          <div>
            <label className="label">Email (superuser)</label>
            <div className="input-wrap">
              <Mail size={18} className="input-icon input-icon-left" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input has-icon-left"
                placeholder="admin@rdkolaci.com"
                autoComplete="username"
                required
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
                className="input has-icon-left"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="input-icon input-icon-right"
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 font-medium">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            Prijavi se
          </button>
        </form>
      </div>
    </div>
  );
}
