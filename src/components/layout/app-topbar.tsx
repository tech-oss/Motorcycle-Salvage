import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";
import { SidebarUser } from "./sidebar-user";

export function AppTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
      {/* SidebarUser is an async Server Component, so it is rendered here and
          passed into the client-side drawer as a slot rather than imported
          inside it. */}
      <MobileNav userSlot={<SidebarUser />} />
      <Logo showSubtitle={false} />
    </header>
  );
}
