import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Operational reporting across the salvage fleet."
      icon={BarChart3}
    />
  );
}
