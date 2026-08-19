import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function InsuranceCompaniesPage() {
  return (
    <ModulePlaceholder
      title="Insurance Companies"
      description="Manage the insurance companies that issue salvage instructions."
      icon={ShieldCheck}
    />
  );
}
