import { Skeleton, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5 max-w-2xl">
      <Skeleton className="h-6 w-24" />
      <div className="card p-5 space-y-3" style={{ borderWidth: 2 }}>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-3 gap-3 mt-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
      <CardGridSkeleton count={3} />
    </div>
  );
}
