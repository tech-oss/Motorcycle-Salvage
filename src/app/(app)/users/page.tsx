import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default function UsersPage() {
  return (
    <ModulePlaceholder
      title="Users"
      description="Manage staff accounts and roles (Admin, Staff, Viewer)."
      icon={Users}
    />
  );
}
