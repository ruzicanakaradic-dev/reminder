import { KpiRowSkeleton, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <KpiRowSkeleton count={3} />
      <CardGridSkeleton count={4} />
    </div>
  );
}
