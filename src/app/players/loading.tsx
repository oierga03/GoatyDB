import { Skeleton } from "@/components/Skeleton";

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
      {/* Filas finas, a juego con el listado real (logo · nombre · división). */}
      <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="h-[26px] w-[26px] shrink-0 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="ml-auto h-3 w-20 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
