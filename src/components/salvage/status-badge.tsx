import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/status";

/** `status` is the database code (e.g. "new_instruction"), not a label. */
export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium whitespace-nowrap", meta.badge)}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
