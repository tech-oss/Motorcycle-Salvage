import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="System configuration for the platform."
      icon={Settings}
    />
  );
}
