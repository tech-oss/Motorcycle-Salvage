import type { BikeStatusCode, UpliftmentStatus } from "@/types/database";

/**
 * Presentation metadata for workflow statuses, keyed by the database code.
 *
 * `bike_statuses` is a table precisely so the workflow can grow without a
 * schema change (PROJECT_SCOPE §18). A code added there but not listed here
 * still renders — see statusMeta() — just without bespoke colours.
 */
export const STATUS_META: Record<
  BikeStatusCode,
  { label: string; badge: string; dot: string }
> = {
  new_instruction: {
    label: "New Instruction",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
  upliftment_pending: {
    label: "Upliftment Pending",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
  },
  scheduled: {
    label: "Scheduled",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  in_transit: {
    label: "In Transit",
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    dot: "bg-orange-400",
  },
  received: {
    label: "Received",
    badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    dot: "bg-teal-400",
  },
  ready_for_sale: {
    label: "Ready for Sale",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  // Seeded by 007 from the client's own master workbook vocabulary.
  not_sold: {
    label: "Not Sold",
    badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  sold: {
    label: "Sold",
    badge: "bg-green-500/15 text-green-300 border-green-500/30",
    dot: "bg-green-400",
  },
  no_salvage: {
    label: "No Salvage",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    dot: "bg-rose-400",
  },
  archived: {
    label: "Archived",
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    dot: "bg-slate-400",
  },
};

const FALLBACK_STATUS = {
  badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  dot: "bg-slate-400",
};

/** Turns snake_case into Title Case for statuses added after this file. */
function humanize(code: string) {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function statusMeta(code: string) {
  return (
    STATUS_META[code as BikeStatusCode] ?? {
      label: humanize(code),
      ...FALLBACK_STATUS,
    }
  );
}

export const UPLIFTMENT_STATUS_LABELS: Record<UpliftmentStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_transit: "In Transit",
  collected: "Collected",
  cancelled: "Cancelled",
};

/** Statuses the dashboard counts as an active upliftment. */
export const UPLIFTMENT_ACTIVE_STATUSES: BikeStatusCode[] = [
  "upliftment_pending",
  "scheduled",
];
