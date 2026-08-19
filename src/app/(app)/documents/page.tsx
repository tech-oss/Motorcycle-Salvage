import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function DocumentsPage() {
  return (
    <ModulePlaceholder
      title="Documents"
      description="Upload, preview, download, rename, and categorize insurance reports, invoices, POPs, and agreements."
      icon={FileText}
    />
  );
}
