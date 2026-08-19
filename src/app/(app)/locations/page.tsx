import { MapPin } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function LocationsPage() {
  return (
    <ModulePlaceholder
      title="Locations"
      description="Manage collection, delivery, and storage locations used across bike records."
      icon={MapPin}
    />
  );
}
