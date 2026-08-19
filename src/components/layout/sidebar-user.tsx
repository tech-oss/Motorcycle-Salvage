import { ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SidebarUser({
  name = "Leonard D.",
  role = "Administrator",
  initials = "LD",
}: {
  name?: string;
  role?: string;
  initials?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-sidebar-border px-3 py-3">
      <Avatar className="border border-sidebar-border">
        <AvatarFallback className="bg-accent text-sm font-medium text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
      <ChevronsUpDown
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
