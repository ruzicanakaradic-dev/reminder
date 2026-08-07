import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5 max-w-2xl">
      <Skeleton className="h-6 w-28" />
      <div className="card p-5 space-y-4" style={{ borderWidth: 2 }}>
        <div className="flex items-start justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-52" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
