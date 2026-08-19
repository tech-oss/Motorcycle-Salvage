import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Lookup data for form selects. Archived rows are excluded so retired
 * insurers/transporters/locations stop appearing as new choices, while
 * existing bikes that reference them keep rendering fine (the bike reads the
 * joined name, not this list).
 */

export type Option = { id: string; name: string };

export async function getInsuranceCompanies(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insurance_companies")
    .select("id, name")
    .eq("archived", false)
    .order("name");

  if (error) throw new Error(`Failed to load insurers: ${error.message}`);
  return data ?? [];
}

export async function getTransporters(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transporters")
    .select("id, name")
    .eq("archived", false)
    .order("name");

  if (error) throw new Error(`Failed to load transporters: ${error.message}`);
  return data ?? [];
}

export async function getLocations(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("archived", false)
    .order("name");

  if (error) throw new Error(`Failed to load locations: ${error.message}`);
  return data ?? [];
}

export type StatusOption = { code: string; label: string };

export async function getBikeStatuses(): Promise<StatusOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bike_statuses")
    .select("code, label")
    .order("sort_order");

  if (error) throw new Error(`Failed to load statuses: ${error.message}`);
  return data ?? [];
}

/** Active users, for the "assigned to" select. */
export async function getAssignableUsers(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name", { nullsFirst: false });

  if (error) throw new Error(`Failed to load users: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name?.trim() || p.email,
  }));
}

export type BikeFormReferenceData = {
  insurers: Option[];
  transporters: Option[];
  locations: Option[];
  statuses: StatusOption[];
  users: Option[];
};

export async function getBikeFormReferenceData(): Promise<BikeFormReferenceData> {
  const [insurers, transporters, locations, statuses, users] =
    await Promise.all([
      getInsuranceCompanies(),
      getTransporters(),
      getLocations(),
      getBikeStatuses(),
      getAssignableUsers(),
    ]);

  return { insurers, transporters, locations, statuses, users };
}
