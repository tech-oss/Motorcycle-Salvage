import Link from "next/link";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { SidebarUser } from "./sidebar-user";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks />
      </div>
      <SidebarUser />
    </aside>
  );
}
