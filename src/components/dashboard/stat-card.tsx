import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * No trend percentage here: there is no historical snapshot to compute one
 * from, and inventing "+12% vs last month" would be a fabricated number on an
 * operations dashboard. Add it once period-over-period data actually exists.
 */
export function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-3 py-5 transition-colors hover:border-primary/40">
      <CardContent className="px-5">
        <Link href={href} className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-foreground">
              {value.toLocaleString("en-ZA")}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
