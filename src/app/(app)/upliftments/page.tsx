import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function UpliftmentsPage() {
  return (
    <ModulePlaceholder
      title="Upliftments"
      description="Create upliftment instructions from bike data and generate professional, printable PDFs."
      icon={ClipboardList}
    />
  );
}
