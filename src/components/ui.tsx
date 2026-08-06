import Link from "next/link";
import type { ReactNode } from "react";

// Naslov strane je već u topbaru; ovde prikazujemo opcioni podnaslov + akciju.
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="sr-only">{title}</h1>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="kicker mb-3" style={{ letterSpacing: ".08em", fontSize: 13 }}>
      {children}
    </h2>
  );
}

export function EmptyState({
  emoji = "🍰",
  title,
  hint,
  cta,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card p-10 text-center animate-in">
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="text-xl font-extrabold">{title}</div>
      {hint && <p className="text-muted text-sm mt-1 max-w-sm mx-auto">{hint}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-5 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
