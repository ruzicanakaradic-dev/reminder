import Link from "next/link";
import type { ReactNode } from "react";

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
        <h1 className="display text-2xl sm:text-3xl font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  emoji = "🌸",
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
      <div className="display text-xl font-semibold text-ink">{title}</div>
      {hint && <p className="text-muted text-sm mt-1 max-w-sm mx-auto">{hint}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-5 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div className="display text-2xl font-semibold mt-1" style={{ color: accent ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
