import { Skeleton, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
