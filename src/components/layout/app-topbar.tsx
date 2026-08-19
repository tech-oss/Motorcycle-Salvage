import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";

export function AppTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
      <MobileNav />
      <Logo showSubtitle={false} />
    </header>
  );
}
