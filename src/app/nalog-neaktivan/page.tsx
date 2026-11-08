"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LockKeyhole, LogOut, Clock } from "lucide-react";

function Sadrzaj() {
  const router = useRouter();
  const params = useSearchParams();
  const razlog = params.get("razlog");

  const blokiran = razlog === "blokiran";

  async function odjava() {
    await fetch("/api/prijava", { method: "DELETE" });
    router.replace("/prijava");
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm card p-6 space-y-4 text-center">
        <div className="flex justify-center">
          {blokiran ? (
            <LockKeyhole size={40} className="text-red-500" />
          ) : (
            <Clock size={40} className="text-amber-500" />
          )}
        </div>
        <h1 className="text-lg font-bold text-ink">
          {blokiran ? "Nalog je blokiran" : "Probni period je istekao"}
        </h1>
        <p className="text-sm text-muted">
          {blokiran
            ? "Pristup ovom nalogu je trenutno onemogućen. Za više informacija kontaktiraj podršku."
            : "Tvoj probni period je istekao. Da nastaviš da koristiš aplikaciju, javi se za aktivaciju naloga."}
        </p>
        <button onClick={odjava} className="btn btn-ghost w-full text-[var(--accent)]">
          <LogOut size={18} /> Odjavi se
        </button>
      </div>
    </div>
  );
}

export default function NalogNeaktivanPage() {
  return (
    <Suspense fallback={null}>
      <Sadrzaj />
    </Suspense>
  );
}
