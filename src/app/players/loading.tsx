import { Skeleton, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="card p-4">
        <Skeleton className="h-10 w-full" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
