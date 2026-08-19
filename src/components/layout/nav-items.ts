import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bike,
  ClipboardList,
  FileText,
  Truck,
  ShieldCheck,
  MapPin,
  BarChart3,
  UploadCloud,
  Users,
  Settings,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Salvage Bikes", href: "/bikes", icon: Bike },
  { title: "Upliftments", href: "/upliftments", icon: ClipboardList },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Transporters", href: "/transporters", icon: Truck },
  { title: "Insurance Companies", href: "/insurance-companies", icon: ShieldCheck },
  { title: "Locations", href: "/locations", icon: MapPin },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Data Import", href: "/imports", icon: UploadCloud },
  { title: "Users", href: "/users", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings },
];
