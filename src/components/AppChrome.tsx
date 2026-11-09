"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Users, BarChart3, ClipboardList, Plus, Settings } from "lucide-react";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { PushSetup } from "@/components/PushSetup";
import { BrandProvider, useBrend } from "@/components/BrandStyle";
import { TrialBanner } from "@/components/TrialBanner";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Danas", icon: Home },
  { href: "/kalendar", label: "Kalendar", icon: CalendarDays },
  { href: "/porudzbine", label: "Porudžbine", icon: ClipboardList },
  { href: "/kupci", label: "Kupci", icon: Users },
  { href: "/statistika", label: "Statistika", icon: BarChart3 },
];

function titleFor(pathname: string): string {
  if (pathname === "/") return "Danas";
  if (pathname === "/porudzbine/nova") return "Nova porudžbina";
  if (pathname.startsWith("/porudzbine/") && pathname.endsWith("/izmena")) return "Izmena porudžbine";
  if (pathname.startsWith("/porudzbine/")) return "Porudžbina";
  if (pathname.startsWith("/porudzbine")) return "Porudžbine";
  if (pathname.startsWith("/kalendar")) return "Kalendar";
  if (pathname.startsWith("/kupci")) return "Kupci";
  if (pathname.startsWith("/statistika")) return "Statistika";
  if (pathname.startsWith("/podesavanja")) return "Podešavanja";
  return "Ružini kolači";
}

// Brend KORISNICE u zaglavlju radnog prostora: njen logo (ili obojeni inicijal)
// + naziv. Koristi boju iz --brand (nivo 2), ne Trust plum.
function BrendZnak() {
  const brend = useBrend();
  const naziv = brend.naziv || "Moj brend";
  const inicijal = (brend.naziv.trim()[0] ?? "B").toUpperCase();
  return (
    <>
      {brend.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brend.logoUrl} alt={naziv} className="w-9 h-9 rounded-[10px] object-cover shrink-0" />
      ) : (
        <span
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: "var(--brand)", fontSize: 15 }}
        >
          {inicijal}
        </span>
      )}
      <span className="font-semibold text-ink truncate" style={{ fontSize: 15 }}>{naziv}</span>
    </>
  );
}

// Kompaktni znak brenda KORISNICE za mobilni topbar: njen logo (ili obojeni
// inicijal) — zamenjuje Trust „T" ikonu kad korisnica ima svoj brend (nivo 2).
function BrendMark() {
  const brend = useBrend();
  const inicijal = (brend.naziv.trim()[0] ?? "B").toUpperCase();
  return brend.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brend.logoUrl}
      alt={brend.naziv || "Logo"}
      className="min-[861px]:hidden w-9 h-9 rounded-[10px] object-cover"
    />
  ) : (
    <span
      className="min-[861px]:hidden w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold"
      style={{ background: "var(--brand)", fontSize: 15 }}
    >
      {inicijal}
    </span>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Samostalne rute bez autentifikovanog chrome-a (sidebar, brend, trial, push):
  // javne (prijava/registracija/proba) i admin (ima svoj superuser kontekst).
  // Ovde se NE sme zvati getBrendAction/getTrialStatusAction jer koriste pbUser()
  // koji redirektuje na /prijava — pa bi javne stranice odskakale na prijavu.
  const samostalna =
    pathname.startsWith("/prijava") ||
    pathname === "/registracija" ||
    pathname === "/proba-shadcn" ||
    pathname === "/nalog-neaktivan" ||
    pathname.startsWith("/admin");
  if (samostalna) return <>{children}</>;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <BrandProvider>
    <div className="flex min-h-dvh">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden min-[861px]:flex w-[230px] flex-none flex-col gap-2 border-r-2 border-[var(--divider)] p-4 sticky top-0 h-dvh overflow-auto">
        <Link href="/" className="flex items-center gap-2.5 pb-1.5">
          <BrendZnak />
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`navitem ${isActive(href) ? "active" : ""}`}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
        <div className="flex-1" />
        <Link href="/podesavanja" className={`navitem ${isActive("/podesavanja") ? "active" : ""}`}>
          <Settings size={20} />
          <span>Podešavanja</span>
        </Link>
        <Link href="/porudzbine/nova" className="btn btn-primary btn-block justify-start mt-1">
          <Plus size={18} /> Nova porudžbina
        </Link>
      </aside>

      {/* ── Glavni deo ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-[var(--divider)] bg-[var(--bg)] px-4 min-[861px]:px-6 h-16">
          <BrendMark />
          <h4 className="flex-1 text-[22px] m-0 truncate">{titleFor(pathname)}</h4>
          <ThemeToggle />
          <Link
            href="/podesavanja"
            className="min-[861px]:hidden btn btn-secondary btn-icon"
            aria-label="Podešavanja"
          >
            <Settings size={18} />
          </Link>
        </header>

        <main className="flex-1 w-full max-w-[1120px] px-4 min-[861px]:px-6 py-5 pb-28 min-[861px]:pb-10">
          <TrialBanner />
          {children}
        </main>
      </div>

      {/* ── Floating "+" (mobile) ── */}
      <Link
        href="/porudzbine/nova"
        className="min-[861px]:hidden fixed bottom-24 right-5 z-40 grid place-items-center w-14 h-14 rounded-full btn-primary shadow-lg pulse-ring"
        aria-label="Nova porudžbina"
      >
        <Plus size={26} />
      </Link>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="min-[861px]:hidden fixed bottom-0 inset-x-0 z-30 flex border-t-2 border-[var(--divider)] bg-[var(--bg)] pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`bnav ${isActive(href) ? "active" : ""}`}>
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </nav>

      <ReminderWatcher />
      <PushSetup />
    </div>
    </BrandProvider>
  );
}
