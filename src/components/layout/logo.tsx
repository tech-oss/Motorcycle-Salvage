import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showSubtitle = true,
}: {
  className?: string;
  showSubtitle?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-b from-primary to-[#b3822a] text-primary-foreground shadow-[0_0_0_3px_rgba(214,162,58,0.12)]">
        <Bike className="size-4.5" aria-hidden="true" strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-bold tracking-wide text-sidebar-foreground uppercase">
          Motorcycle Salvage
        </span>
        {showSubtitle && (
          <span className="block text-[10px] font-medium tracking-[0.2em] text-primary/80 uppercase">
            South Africa
          </span>
        )}
      </span>
    </div>
  );
}
