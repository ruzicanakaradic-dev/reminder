import { Skeleton, KpiRowSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <KpiRowSkeleton count={3} />
      <KpiRowSkeleton count={4} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
