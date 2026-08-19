import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/fixtures/bikes";
import type { BikeStatus } from "@/types/bike";

export function StatusBadge({ status }: { status: BikeStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium whitespace-nowrap", colors.badge)}
    >
      <span className={cn("size-1.5 rounded-full", colors.dot)} aria-hidden="true" />
      {status}
    </Badge>
  );
}
