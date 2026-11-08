"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getBrendAction } from "@/app/actions";
import type { BrendKorisnice } from "@/lib/types";

// Brend KORISNICE (nivo 2): njena boja, naziv i logo za NJEN radni prostor.
// Nezavisno od Trust identiteta (nivo 1). Boja se primenjuje kao CSS var
// --brand na <html>; akcenti radnog dela koriste var(--brand) / bg-brand-user.

const BrendCtx = createContext<BrendKorisnice>({ naziv: "", boja: null, logoUrl: null });

export function useBrend() {
  return useContext(BrendCtx);
}

function normalizeHex(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : null;
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brend, setBrend] = useState<BrendKorisnice>({ naziv: "", boja: null, logoUrl: null });

  useEffect(() => {
    let alive = true;
    getBrendAction()
      .then((b) => {
        if (alive) setBrend(b);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const val = normalizeHex(brend.boja);
    const root = document.documentElement;
    // shadcn komponente (Button/Input focus…) koriste --primary/--ring. U radnom
    // prostoru = boja korisnice (nivo 2), pa i shadcn i stare .btn klase nose
    // istu boju. Bez boje → ukloni (pada na Trust plum iz globals.css).
    const brandProps = ["--brand", "--primary", "--ring"];
    if (val) brandProps.forEach((p) => root.style.setProperty(p, val));
    else brandProps.forEach((p) => root.style.removeProperty(p));
    return () => {
      brandProps.forEach((p) => root.style.removeProperty(p));
    };
  }, [brend.boja]);

  return <BrendCtx.Provider value={brend}>{children}</BrendCtx.Provider>;
}
