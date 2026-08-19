import { UploadCloud } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function ImportsPage() {
  return (
    <ModulePlaceholder
      title="Data Import"
      description="Migrate historical bikes from Excel: upload, map columns, validate, detect duplicates, and import."
      icon={UploadCloud}
    />
  );
}
