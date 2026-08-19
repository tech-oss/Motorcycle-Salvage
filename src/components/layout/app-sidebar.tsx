import Link from "next/link";
import { Bike } from "lucide-react";
import { NavLinks } from "./nav-links";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bike className="size-4.5" aria-hidden="true" />
          </span>
          <span className="text-sm leading-tight font-semibold text-sidebar-foreground">
            Salvage
            <br />
            <span className="text-xs font-normal text-muted-foreground">
              Management Platform
            </span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks />
      </div>
    </aside>
  );
}
