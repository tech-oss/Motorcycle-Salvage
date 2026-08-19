import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Profile, UserRole } from "@/types/database";

/**
 * Server-side role helpers.
 *
 * These are a convenience for rendering and for failing fast in Server
 * Actions — they are NOT the security boundary. RLS in the database is
 * (ARCHITECTURE.md §6). Never rely on these alone to protect data.
 */

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** Redirects to login when there is no session. Returns the profile otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=account_disabled");
  return profile;
}

export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard?error=forbidden");
  return profile;
}

export const isAdmin = (profile: Profile | null) => profile?.role === "admin";

/** Admins and staff may write; viewers may not. */
export const canWrite = (profile: Profile | null) =>
  profile?.role === "admin" || profile?.role === "staff";
