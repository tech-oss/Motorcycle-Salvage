import { Bike } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function BikesPage() {
  return (
    <ModulePlaceholder
      title="Salvage Bikes"
      description="The central record for every bike — identification, insurance, condition, location, financials, and history."
      icon={Bike}
    />
  );
}
