import { MapPin } from "lucide-react";

export function LocationBars({
  data,
}: {
  data: readonly { label: string; value: number; percentage: number }[];
}) {
  return (
    <ul className="flex flex-col gap-4">
      {data.map((row) => (
        <li key={row.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-foreground">
              <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {row.label}
            </span>
            <span className="text-muted-foreground">
              {row.value} <span className="text-xs">({row.percentage}%)</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.percentage}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
