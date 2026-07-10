export function EmptyState({
  title,
  description,
  icon = "🔍",
}: {
  title: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      )}
    </div>
  );
}
