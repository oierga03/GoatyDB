import type { PlayerRole } from "@prisma/client";
import { roleLabel } from "@/lib/labels";

export function RoleTag({ role }: { role: PlayerRole }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
      {roleLabel(role)}
    </span>
  );
}
