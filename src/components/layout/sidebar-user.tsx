import { getCurrentProfile } from "@/lib/supabase/auth";
import { SidebarUserMenu } from "./sidebar-user-menu";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  staff: "Staff",
  viewer: "Viewer",
};

function initialsFor(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export async function SidebarUser() {
  const profile = await getCurrentProfile();

  // The proxy gates every app route, so this is only reachable transiently.
  if (!profile) return null;

  const name = profile.full_name?.trim() || profile.email;

  return (
    <SidebarUserMenu
      name={name}
      role={ROLE_LABELS[profile.role] ?? profile.role}
      initials={initialsFor(profile.full_name ?? "", profile.email)}
    />
  );
}
