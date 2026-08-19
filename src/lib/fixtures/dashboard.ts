/**
 * Dashboard numbers derived from the same bike fixture array — mirrors how
 * the real Supabase aggregation queries will work once connected (see
 * fixtures/bikes.ts). Trend deltas have no fixture history to compute from,
 * so they stay as illustrative static labels until real time-series data
 * exists.
 */
import { getBikes } from "./bikes";
import type { BikeStatus } from "@/types/bike";

const TREND_DELTAS: Record<string, string> = {
  "Total Bikes": "+12%",
  "New Instructions": "+5%",
  Upliftments: "+7%",
  "In Transit": "+3%",
  "Ready for Sale": "+11%",
};

function countByStatus(statuses: BikeStatus[]) {
  const bikes = getBikes();
  return bikes.filter((b) => statuses.includes(b.status)).length;
}

export function getDashboardStats() {
  const bikes = getBikes();
  const counts = {
    "Total Bikes": bikes.length,
    "New Instructions": countByStatus(["New Instruction"]),
    Upliftments: countByStatus(["Upliftment Pending", "Scheduled"]),
    "In Transit": countByStatus(["In Transit"]),
    "Ready for Sale": countByStatus(["Ready for Sale"]),
  };

  return Object.entries(counts).map(([label, value]) => ({
    label,
    value,
    delta: TREND_DELTAS[label],
    period: "vs last month",
  }));
}

const INSURER_COLORS: Record<string, string> = {
  "Hollard Insurance": "#d6a23a",
  OUTsurance: "#5b8def",
  Santam: "#34d399",
  "Absa Insurance": "#f87171",
  MiWay: "#94a3b8",
};

export function getBikesByInsurance() {
  const bikes = getBikes();
  const counts = new Map<string, number>();
  for (const bike of bikes) {
    counts.set(bike.insuranceCompany, (counts.get(bike.insuranceCompany) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label: label.replace(" Insurance", ""),
      value,
      color: INSURER_COLORS[label] ?? "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);
}

const UPLIFTMENT_STAGE_COLORS: Record<string, string> = {
  Pending: "#d6a23a",
  Arranged: "#5b8def",
  "In Transit": "#f87171",
  Collected: "#34d399",
};

export function getUpliftmentStatusBreakdown() {
  const bikes = getBikes();
  const stageOf = (status: BikeStatus): string | null => {
    if (status === "Upliftment Pending") return "Pending";
    if (status === "Scheduled") return "Arranged";
    if (status === "In Transit") return "In Transit";
    if (status === "Received" || status === "Ready for Sale") return "Collected";
    return null;
  };

  const counts = new Map<string, number>();
  for (const bike of bikes) {
    const stage = stageOf(bike.status);
    if (!stage) continue;
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return ["Pending", "Arranged", "In Transit", "Collected"]
    .filter((stage) => counts.has(stage))
    .map((stage) => ({
      label: stage,
      value: counts.get(stage)!,
      color: UPLIFTMENT_STAGE_COLORS[stage],
    }));
}

export function getBikesByLocation() {
  const bikes = getBikes();
  const counts = new Map<string, number>();
  for (const bike of bikes) {
    counts.set(bike.city, (counts.get(bike.city) ?? 0) + 1);
  }
  const total = bikes.length || 1;
  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

export const RECENT_IMPORTS = [
  {
    fileName: "Salvage_Bikes_July.xlsx",
    importedBy: "Leonard D.",
    date: "2026-08-04 10:30",
    records: 218,
    status: "Completed",
  },
  {
    fileName: "Bikes_Export_June.xlsx",
    importedBy: "Leonard D.",
    date: "2026-07-28 15:20",
    records: 205,
    status: "Completed",
  },
  {
    fileName: "Salvage_May.xlsx",
    importedBy: "Leonard D.",
    date: "2026-07-15 11:05",
    records: 187,
    status: "Completed",
  },
] as const;
