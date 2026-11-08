"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserPlus, Ban, CheckCircle2, Clock, CreditCard, Loader2,
  LogOut, ShieldCheck, X, AlertTriangle, Search,
} from "lucide-react";
import type { AdminUser, Plan, StanjeNaloga } from "@/lib/types";
import {
  blokirajAction, kreirajNalogAction, planAction, produziTrialAction,
} from "@/app/admin/actions";
import { razumljivaPoruka } from "@/lib/greske";

// Stanje naloga (isto pravilo kao na serveru u admin.ts) za bedž.
function stanje(u: AdminUser): StanjeNaloga {
  if (u.blokiran) return "blokiran";
  if (u.plan === "paid") return "aktivan";
  const danas = new Date().toISOString().slice(0, 10);
  if (u.trial_do && u.trial_do < danas) return "trial_istekao";
  return "trial";
}

const BEDZ: Record<StanjeNaloga, { tekst: string; cls: string; Icon: typeof CheckCircle2 }> = {
  aktivan: { tekst: "Plaćen", cls: "bg-[var(--accent-100)] text-[var(--accent-800)]", Icon: CreditCard },
  trial: { tekst: "Trial", cls: "bg-amber-100 text-amber-800", Icon: Clock },
  trial_istekao: { tekst: "Trial istekao", cls: "bg-orange-100 text-orange-800", Icon: AlertTriangle },
  blokiran: { tekst: "Blokiran", cls: "bg-red-100 text-red-700", Icon: Ban },
};

export function AdminKonzola({ pocetne }: { pocetne: AdminUser[] }) {
  const router = useRouter();
  const [korisnice, setKorisnice] = useState<AdminUser[]>(pocetne);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // id reda u obradi
  const [msg, setMsg] = useState<{ tekst: string; tone: "ok" | "warn" } | null>(null);
  const [noviOtvoren, setNoviOtvoren] = useState(false);

  const filtrirane = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return korisnice;
    return korisnice.filter(
      (u) => u.email.toLowerCase().includes(t) || (u.ime_biznisa ?? "").toLowerCase().includes(t)
    );
  }, [korisnice, q]);

  function reci(tekst: string, tone: "ok" | "warn" = "ok") {
    setMsg({ tekst, tone });
  }

  // Osveži listu sa servera posle promene.
  async function osvezi() {
    router.refresh();
  }

  async function blok(u: AdminUser, blokiran: boolean) {
    setBusy(u.id);
    setMsg(null);
    const r = await blokirajAction(u.id, blokiran);
    if (r.ok) {
      setKorisnice((xs) => xs.map((x) => (x.id === u.id ? { ...x, blokiran } : x)));
      reci(blokiran ? `${u.email} je blokiran.` : `${u.email} je odblokiran.`);
    } else reci(r.greska, "warn");
    setBusy(null);
  }

  async function promeniPlan(u: AdminUser, plan: Plan) {
    setBusy(u.id);
    setMsg(null);
    const r = await planAction(u.id, plan);
    if (r.ok) {
      setKorisnice((xs) =>
        xs.map((x) => (x.id === u.id ? { ...x, plan, trial_do: plan === "paid" ? null : x.trial_do } : x))
      );
      reci(plan === "paid" ? `${u.email} je sada plaćen nalog.` : `${u.email} je vraćen na trial.`);
    } else reci(r.greska, "warn");
    setBusy(null);
  }

  async function produzi(u: AdminUser) {
    setBusy(u.id);
    setMsg(null);
    const r = await produziTrialAction(u.id, 5);
    if (r.ok) {
      await osvezi();
      reci(`Trial za ${u.email} produžen za 5 dana.`);
    } else reci(r.greska, "warn");
    setBusy(null);
  }

  async function odjava() {
    await fetch("/api/admin/prijava", { method: "DELETE" });
    router.replace("/admin/prijava");
    router.refresh();
  }

  const brojPlacenih = korisnice.filter((u) => stanje(u) === "aktivan").length;
  const brojTrial = korisnice.filter((u) => stanje(u) === "trial").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Zaglavlje */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-ink">
          <ShieldCheck size={22} className="text-[var(--brand-plum)]" />
          <h1 className="text-xl font-bold">Admin konzola</h1>
        </div>
        <button onClick={odjava} className="btn btn-ghost text-sm text-[var(--brand-plum)]">
          <LogOut size={16} /> Odjava
        </button>
      </div>

      {/* Sažetak */}
      <div className="grid grid-cols-3 gap-3">
        <SazetakKartica Icon={Users} broj={korisnice.length} oznaka="Ukupno" />
        <SazetakKartica Icon={CreditCard} broj={brojPlacenih} oznaka="Plaćenih" />
        <SazetakKartica Icon={Clock} broj={brojTrial} oznaka="Na trialu" />
      </div>

      {/* Traka: pretraga + novi nalog */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="input-wrap flex-1 min-w-[200px]">
          <Search size={16} className="input-icon input-icon-left" />
          <input
            className="input has-icon-left"
            placeholder="Pretraži po email-u ili biznisu…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button onClick={() => setNoviOtvoren(true)} className="btn btn-primary text-sm">
          <UserPlus size={16} /> Novi nalog
        </button>
      </div>

      {msg && (
        <div
          className={`text-sm font-medium flex items-start gap-1.5 ${
            msg.tone === "warn" ? "text-red-600" : "text-[var(--brand-plum)]"
          }`}
        >
          {msg.tone === "warn" ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          )}
          <span>{msg.tekst}</span>
        </div>
      )}

      {/* Tabela korisnica */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-[var(--border,#eee)]">
                <th className="px-4 py-3 font-semibold">Nalog</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Porudžbine</th>
                <th className="px-4 py-3 font-semibold">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtrirane.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Nema korisnica za prikaz.
                  </td>
                </tr>
              ) : (
                filtrirane.map((u) => {
                  const st = stanje(u);
                  const bedz = BEDZ[st];
                  const red = busy === u.id;
                  return (
                    <tr key={u.id} className="border-b border-[var(--border,#f3f3f3)] last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{u.ime_biznisa || "—"}</div>
                        <div className="text-muted text-xs">{u.email}</div>
                        {u.trial_do && st !== "aktivan" && (
                          <div className="text-xs text-muted">Trial do {u.trial_do}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${bedz.cls}`}
                        >
                          <bedz.Icon size={12} /> {bedz.tekst}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{u.broj_porudzbina}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {red ? (
                            <Loader2 size={16} className="animate-spin text-muted" />
                          ) : (
                            <>
                              {u.plan === "free" ? (
                                <button
                                  onClick={() => promeniPlan(u, "paid")}
                                  className="btn btn-secondary text-xs px-2 py-1"
                                  title="Označi kao plaćen"
                                >
                                  <CreditCard size={13} /> Plaćen
                                </button>
                              ) : (
                                <button
                                  onClick={() => promeniPlan(u, "free")}
                                  className="btn btn-ghost text-xs px-2 py-1"
                                  title="Vrati na trial"
                                >
                                  <Clock size={13} /> Na trial
                                </button>
                              )}
                              {st === "trial_istekao" && (
                                <button
                                  onClick={() => produzi(u)}
                                  className="btn btn-secondary text-xs px-2 py-1"
                                  title="Produži trial za 5 dana"
                                >
                                  <Clock size={13} /> +5 dana
                                </button>
                              )}
                              {u.blokiran ? (
                                <button
                                  onClick={() => blok(u, false)}
                                  className="btn btn-ghost text-xs px-2 py-1 text-[var(--brand-plum)]"
                                >
                                  <CheckCircle2 size={13} /> Odblokiraj
                                </button>
                              ) : (
                                <button
                                  onClick={() => blok(u, true)}
                                  className="btn btn-ghost text-xs px-2 py-1 text-red-600"
                                >
                                  <Ban size={13} /> Blokiraj
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {noviOtvoren && (
        <NoviNalogModal
          onClose={() => setNoviOtvoren(false)}
          onKreiran={(u) => {
            setKorisnice((xs) => [u, ...xs]);
            setNoviOtvoren(false);
            reci(`Nalog ${u.email} je kreiran.`);
          }}
        />
      )}
    </div>
  );
}

function SazetakKartica({
  Icon,
  broj,
  oznaka,
}: {
  Icon: typeof Users;
  broj: number;
  oznaka: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Icon size={20} className="text-[var(--brand-plum)] shrink-0" />
      <div>
        <div className="text-xl font-bold text-ink tabular-nums">{broj}</div>
        <div className="text-xs text-muted">{oznaka}</div>
      </div>
    </div>
  );
}

// Modal za kreiranje naloga.
function NoviNalogModal({
  onClose,
  onKreiran,
}: {
  onClose: () => void;
  onKreiran: (u: AdminUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [imeBiznisa, setImeBiznisa] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [trialDana, setTrialDana] = useState("5");
  const [busy, setBusy] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);

  async function kreiraj() {
    setBusy(true);
    setGreska(null);
    try {
      const r = await kreirajNalogAction({
        email,
        lozinka,
        ime_biznisa: imeBiznisa || undefined,
        plan,
        trial_dana: plan === "free" ? parseInt(trialDana, 10) || 5 : undefined,
      });
      if (r.ok) onKreiran(r.data);
      else setGreska(r.greska);
    } catch (e) {
      setGreska(razumljivaPoruka(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <UserPlus size={18} className="text-[var(--brand-plum)]" /> Novi nalog
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Zatvori">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="koleginica@primer.rs"
            />
          </div>
          <div>
            <label className="label">Ime biznisa (opciono)</label>
            <input
              className="input"
              value={imeBiznisa}
              onChange={(e) => setImeBiznisa(e.target.value)}
              placeholder="npr. Milkine torte"
            />
          </div>
          <div>
            <label className="label">Lozinka (min 8 znakova)</label>
            <input
              className="input"
              type="text"
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              placeholder="Pošalji je koleginici"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plan</label>
              <select
                className="input"
                value={plan}
                onChange={(e) => setPlan(e.target.value === "paid" ? "paid" : "free")}
              >
                <option value="free">Trial</option>
                <option value="paid">Plaćen</option>
              </select>
            </div>
            {plan === "free" && (
              <div>
                <label className="label">Trial (dana)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={trialDana}
                  onChange={(e) => setTrialDana(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {greska && <div className="text-sm text-red-600 font-medium">{greska}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost text-sm">
            Otkaži
          </button>
          <button onClick={kreiraj} disabled={busy} className="btn btn-primary text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Kreiraj
          </button>
        </div>
      </div>
    </div>
  );
}
