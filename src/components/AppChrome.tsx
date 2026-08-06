"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Users, BarChart3, ClipboardList, Plus, Settings } from "lucide-react";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { PushSetup } from "@/components/PushSetup";

const NAV = [
  { href: "/", label: "Danas", icon: Home },
  { href: "/porudzbine", label: "Porudžbine", icon: ClipboardList },
  { href: "/kalendar", label: "Kalendar", icon: CalendarDays },
  { href: "/kupci", label: "Kupci", icon: Users },
  { href: "/statistika", label: "Statistika", icon: BarChart3 },
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/prijava";

  if (isAuthPage) return <>{children}</>;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream/80 border-b border-line">
        <div className="mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white text-xl shadow-sm">
              🌹
            </span>
            <span className="leading-tight">
              <span className="block display text-[15px] font-semibold text-ink">
                Ružini domaći kolači
              </span>
              <span className="block text-[11px] text-muted -mt-0.5">Dnevnik porudžbina</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/porudzbine/nova" className="btn btn-primary text-sm hidden sm:inline-flex">
              <Plus size={18} /> Nova porudžbina
            </Link>
            <Link
              href="/podesavanja"
              className="grid place-items-center w-10 h-10 rounded-full btn-ghost !p-0"
              aria-label="Podešavanja"
            >
              <Settings size={19} />
            </Link>
          </div>
        </div>
      </header>

      {/* Sadržaj */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-5 pb-28">{children}</main>

      {/* Floating dugme (mobile) */}
      <Link
        href="/porudzbine/nova"
        className="sm:hidden fixed bottom-24 right-5 z-40 grid place-items-center w-14 h-14 rounded-full btn-primary shadow-lg pulse-ring"
        aria-label="Nova porudžbina"
      >
        <Plus size={26} />
      </Link>

      {/* Donja navigacija */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-cream/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-4xl px-2 grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors"
                style={{ color: active ? "var(--rose-600)" : "var(--muted)" }}
              >
                <span
                  className="grid place-items-center w-10 h-8 rounded-xl transition-colors"
                  style={{ background: active ? "var(--rose-100)" : "transparent" }}
                >
                  <Icon size={20} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Pozadinski servisi */}
      <ReminderWatcher />
      <PushSetup />
    </div>
  );
}
