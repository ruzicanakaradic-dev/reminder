"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getBrendAction } from "@/app/actions";
import type { BrendKorisnice } from "@/lib/types";

// Brend KORISNICE (nivo 2): njena boja, naziv i logo za NJEN radni prostor.
// Nezavisno od Trust identiteta (nivo 1). Boja se primenjuje kao CSS var
// --brand na <html>; akcenti radnog dela koriste var(--brand) / bg-brand-user.
//
// VAŽNO: korisnicina boja se NE lepi sirova. Pastelna boja na svetloj temi ili
// tamna boja na dark temi pala bi ispod minimuma kontrasta (tekst/nav/dugme
// nečitljivi). Zato BrandStyle boju prilagodi AKTIVNOJ temi tako da uvek drži
// bar ~4.5:1 kontrasta prema podlozi, i bira crni/beli tekst na dugmetu po
// svetlini boje. Reaguje i na prebacivanje svetlo/tamno.

const BrendCtx = createContext<BrendKorisnice>({ naziv: "", boja: null, logoUrl: null });

export function useBrend() {
  return useContext(BrendCtx);
}

function normalizeHex(v: string | null | undefined): string | null {
  if (!v) return null;
  let s = v.trim();
  if (/^#?([0-9a-fA-F]{3})$/.test(s)) {
    const h = s.replace("#", "");
    s = "#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return /^#[0-9a-fA-F]{6}$/.test(s.startsWith("#") ? s : "#" + s)
    ? (s.startsWith("#") ? s : "#" + s).toLowerCase()
    : null;
}

// ── Mali color util (hex ↔ hsl, relativna svetlina, kontrast) ──────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function relLum(hex: string): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function adjustL(hex: string, deltaL: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, s, Math.max(0, Math.min(1, l + deltaL)));
}

// Pomeraj svetlinu boje (čuvajući ton) dok ne dostigne traženi kontrast prema
// podlozi. dir: +1 posvetli (tamna tema), −1 potamni (svetla tema).
function ensureContrast(hex: string, bg: string, target: number, dir: 1 | -1): string {
  let [h, s, l] = rgbToHsl(...hexToRgb(hex));
  for (let i = 0; i < 100 && contrast(hslToHex(h, s, l), bg) < target; i++) {
    l += dir * 0.01;
    if (l <= 0 || l >= 1) { l = Math.max(0, Math.min(1, l)); break; }
  }
  return hslToHex(h, s, l);
}
// Belo ili skoro-crno — šta god ima bolji kontrast na brend podlozi (za dugme).
function pickForeground(brand: string): string {
  const dark = "#141216";
  return contrast("#ffffff", brand) >= contrast(dark, brand) ? "#ffffff" : dark;
}

// Primeni brend boju KORISNICE (kontrast-sigurno) na radni prostor, odmah.
// null/prazno/nevalidno → očisti inline i vrati se na Trust plum (default).
// Deljeno: koristi ga i BrandProvider (iz baze) i MojBrend (živi pregled).
export function applyBrandColor(color: string | null | undefined) {
  const root = document.documentElement;
  const props = ["--brand", "--primary", "--ring", "--brand-foreground", "--primary-foreground", "--accent-600", "--accent-700"];
  const val = normalizeHex(color ?? null);
  if (!val) {
    props.forEach((p) => root.style.removeProperty(p));
    return;
  }
  const dark = root.classList.contains("dark");
  const bg = dark ? "#241b2d" : "#ffffff";
  const brand = ensureContrast(val, bg, 4.5, dark ? 1 : -1);
  const fg = pickForeground(brand);
  root.style.setProperty("--brand", brand);
  root.style.setProperty("--primary", brand);
  root.style.setProperty("--ring", brand);
  root.style.setProperty("--brand-foreground", fg);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--accent-600", adjustL(brand, dark ? 0.08 : -0.08));
  root.style.setProperty("--accent-700", adjustL(brand, dark ? -0.06 : -0.16));
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
    const root = document.documentElement;
    const apply = () => applyBrandColor(brend.boja);
    apply();
    // Reaguj na prebacivanje teme (ThemeToggle menja .dark na <html>) —
    // boja se ponovo prilagodi kontrastu nove teme.
    const obs = new MutationObserver((muts) => {
      if (muts.some((m) => m.attributeName === "class")) apply();
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      obs.disconnect();
      applyBrandColor(null);
    };
  }, [brend.boja]);

  return <BrendCtx.Provider value={brend}>{children}</BrendCtx.Provider>;
}
