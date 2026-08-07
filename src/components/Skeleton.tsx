// Skeleton placeholderi za loading.tsx ekrane — daju trenutni odziv pri navigaciji.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Kartica koja imitira OrderCard / stavku liste
export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-3 w-40" />
      <div className="flex justify-between pt-3" style={{ borderTop: "2px solid var(--divider)" }}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Mreža kartica
export function CardGridSkeleton({ count = 6, cols = 1 }: { count?: number; cols?: 1 | 2 }) {
  const gridCls = cols === 2 ? "grid-cols-1 min-[861px]:grid-cols-2" : "grid-cols-1";
  return (
    <div className={`grid ${gridCls} gap-3 animate-in`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Red KPI kartica
export function KpiRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
