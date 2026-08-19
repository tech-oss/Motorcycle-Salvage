import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function NewBikePage() {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/bikes" className="hover:text-foreground">
          Salvage Bikes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">New Instruction</span>
      </nav>

      <ModulePlaceholder
        title="New Salvage Instruction"
        description="Manual data capture for a new bike record — identification, insurance, motorcycle, condition, location and financial fields — lands with the Salvage Bikes write path."
        icon={Plus}
      />
    </div>
  );
}
