import type { TeamEntryResult } from "@prisma/client";
import { RESULT_BADGE_CLASS, resultLabel } from "@/lib/labels";

export function ResultBadge({ result }: { result: TeamEntryResult }) {
  return (
    <span className={`badge ${RESULT_BADGE_CLASS[result]}`}>
      {resultLabel(result)}
    </span>
  );
}
