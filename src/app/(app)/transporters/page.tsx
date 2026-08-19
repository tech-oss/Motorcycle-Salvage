import { Truck } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function TransportersPage() {
  return (
    <ModulePlaceholder
      title="Transporters"
      description="Manage the transporter companies used for bike upliftment and delivery."
      icon={Truck}
    />
  );
}
