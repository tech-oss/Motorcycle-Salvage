import "server-only";
import { createClient } from "@/lib/supabase/server";
import { UPLIFTMENT_ACTIVE_STATUSES, statusMeta } from "@/lib/status";

/**
 * Dashboard aggregations (PROJECT_SCOPE §9). Counts use Supabase's
 * `head: true` + `count: 'exact'` so the database does the counting and no
 * rows cross the wire.
 *
 * Archived bikes are excluded everywhere — the dashboard describes live
 * operations, and including archived records would inflate every figure.
 */

const CHART_COLORS = [
  "#d6a23a",
  "#5b8def",
  "#34d399",
  "#f87171",
  "#94a3b8",
  "#c084fc",
  "#fbbf24",
];

export type DashboardStat = {
  label: string;
  value: number;
  href: string;
};

export async function getDashboardStats(): Promise<DashboardStat[]> {
  const supabase = await createClient();

  const base = () =>
    supabase
      .from("salvage_bikes")
      .select("id", { count: "exact", head: true })
      .eq("archived", false);

  const [total, newInstructions, upliftments, inTransit, readyForSale] =
    await Promise.all([
      base(),
      base().eq("status", "new_instruction"),
      base().in("status", UPLIFTMENT_ACTIVE_STATUSES),
      base().eq("status", "in_transit"),
      base().eq("status", "ready_for_sale"),
    ]);

  for (const result of [total, newInstructions, upliftments, inTransit, readyForSale]) {
    if (result.error) {
      throw new Error(`Dashboard counts failed: ${result.error.message}`);
    }
  }

  return [
    { label: "Total Bikes", value: total.count ?? 0, href: "/bikes" },
    {
      label: "New Instructions",
      value: newInstructions.count ?? 0,
      href: "/bikes?status=new_instruction",
    },
    {
      label: "Upliftments",
      value: upliftments.count ?? 0,
      href: "/upliftments",
    },
    {
      label: "In Transit",
      value: inTransit.count ?? 0,
      href: "/bikes?status=in_transit",
    },
    {
      label: "Ready for Sale",
      value: readyForSale.count ?? 0,
      href: "/bikes?status=ready_for_sale",
    },
  ];
}

export type Segment = { label: string; value: number; color: string };

function tally(labels: (string | null)[], fallback = "Unassigned"): Segment[] {
  const counts = new Map<string, number>();
  for (const raw of labels) {
    const label = raw?.trim() || fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
}

export async function getBikesByInsurance(): Promise<Segment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("insurance_companies(name)")
    .eq("archived", false);

  if (error) throw new Error(`Bikes by insurance failed: ${error.message}`);

  const rows = data as unknown as { insurance_companies: { name: string } | null }[];
  return tally(
    rows.map((r) => r.insurance_companies?.name.replace(/ Insurance$/, "") ?? null),
    "No insurer"
  );
}

export async function getUpliftmentStatusBreakdown(): Promise<Segment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("status")
    .eq("archived", false);

  if (error) throw new Error(`Upliftment breakdown failed: ${error.message}`);

  // Map bike workflow states onto the upliftment stages the client thinks in.
  const stageOf = (status: string): string | null => {
    if (status === "upliftment_pending") return "Pending";
    if (status === "scheduled") return "Arranged";
    if (status === "in_transit") return "In Transit";
    if (status === "received" || status === "ready_for_sale") return "Collected";
    return null;
  };

  const stages = (data ?? [])
    .map((r) => stageOf(r.status))
    .filter((s): s is string => s !== null);

  const order = ["Pending", "Arranged", "In Transit", "Collected"];
  return tally(stages).sort(
    (a, b) => order.indexOf(a.label) - order.indexOf(b.label)
  );
}

export type LocationRow = { label: string; value: number; percentage: number };

export async function getBikesByLocation(): Promise<LocationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("current_location, locations!salvage_bikes_current_location_id_fkey(city, name)")
    .eq("archived", false);

  if (error) throw new Error(`Bikes by location failed: ${error.message}`);

  const rows = data as unknown as {
    current_location: string | null;
    locations: { city: string | null; name: string } | null;
  }[];

  // Prefer the normalized location's city; fall back to the free-text field
  // that historical Excel rows carry.
  const labels = rows.map(
    (r) => r.locations?.city ?? r.locations?.name ?? r.current_location ?? null
  );

  const total = labels.length || 1;
  return tally(labels, "Unknown").map((s) => ({
    label: s.label,
    value: s.value,
    percentage: Math.round((s.value / total) * 100),
  }));
}

/** Status counts for the bike list's filter chips. */
export async function getStatusCounts(): Promise<
  { code: string; label: string; count: number }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("status")
    .eq("archived", false);

  if (error) throw new Error(`Status counts failed: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([code, count]) => ({
    code,
    label: statusMeta(code).label,
    count,
  }));
}
