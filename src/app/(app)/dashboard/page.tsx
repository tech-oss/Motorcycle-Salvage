import { LayoutDashboard } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function DashboardPage() {
  return (
    <ModulePlaceholder
      title="Dashboard"
      description="Fleet KPIs, recent instructions, and status breakdowns — wired to live data once the Salvage Bikes module lands."
      icon={LayoutDashboard}
    />
  );
}
