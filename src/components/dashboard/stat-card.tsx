import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  delta,
  period,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta: string;
  period: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardContent className="flex items-start justify-between px-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">
            {value.toLocaleString()}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp className="size-3" aria-hidden="true" />
            {delta}
            <span className="text-muted-foreground">{period}</span>
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
