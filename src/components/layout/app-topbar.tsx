"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav-items";

export function AppTopbar() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <MobileNav />
      <h1 className="text-base font-semibold text-foreground md:text-lg">
        {current?.title ?? "Salvage Management Platform"}
      </h1>
    </header>
  );
}
