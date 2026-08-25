import { z } from "zod";

/**
 * Validation for the salvage bike form.
 *
 * Field set was trimmed to exactly what the client's real Excel master
 * contains (client feedback, 2026-08-25) — the richer schema from the
 * original scope brief (assessor/insured contact details, accident
 * condition, tyre depths) never matched what the client actually tracks and
 * is deferred, not deleted: those columns still exist in the database for
 * anything already saved, they're just no longer editable here.
 *
 * Deliberately permissive beyond `stock_number`. Salvage instructions arrive
 * incomplete — a bike often lands with a claim number and nothing else, and
 * the rest is filled in over days as the transporter reports back. Forcing
 * fields the client doesn't have yet would push staff back to Excel, which
 * is the exact problem this replaces (PROJECT_SCOPE §3).
 *
 * HTML forms submit strings for everything, so each field coerces "" to null
 * rather than passing an empty string to a date/numeric column.
 */

/** "" → null, so optional text columns stay NULL instead of empty string. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** "" → null, otherwise a finite number. Rejects "abc" with a clear message. */
function optionalNumber(label: string, opts?: { min?: number; max?: number }) {
  return z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v === null || v === "" || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === null || !Number.isNaN(v), {
      message: `${label} must be a number`,
    })
    .refine((v) => v === null || opts?.min === undefined || v >= opts.min, {
      message: `${label} cannot be less than ${opts?.min}`,
    })
    .refine((v) => v === null || opts?.max === undefined || v <= opts.max, {
      message: `${label} cannot be more than ${opts?.max}`,
    });
}

/** "" → null. A `<input type="date">` gives YYYY-MM-DD or "". */
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Use a valid date",
  });

/** Select placeholders submit "" — treat as "not chosen". */
const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine(
    (v) =>
      v === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    { message: "Invalid selection" }
  );

/**
 * The refine is a type predicate rather than a plain boolean so the output
 * narrows to the union — otherwise this widens to `string` and the typed
 * Supabase client rejects the insert.
 */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v): v is T[number] | null =>
        v === null || values.includes(v as T[number]),
      { message: "Invalid selection" }
    );

export const bikeFormSchema = z.object({
  // Identification — stock_number is the business key (duplicate detection,
  // QR targets), so it is the one genuinely required field.
  stock_number: z
    .string()
    .trim()
    .min(1, "Stock number is required")
    .max(50, "Stock number is too long"),
  claim_number: optionalText,
  status: z.string().trim().min(1, "Status is required"),

  // Insurance
  insurance_company_id: optionalUuid,
  broker: optionalText,
  claims_handler: optionalText,
  salvage_clerk: optionalText,

  // Motorcycle
  make: optionalText,
  model: optionalText,
  year: optionalNumber("Year", { min: 1900, max: 2100 }),
  engine_capacity_cc: optionalNumber("CC", { min: 0 }),
  registration_number: optionalText,
  vin_number: optionalText,
  engine_number: optionalText,
  keys_status: optionalEnum(["yes", "no", "tbc"] as const),
  write_off_code: optionalText,
  loss_date: optionalDate,

  // Location — free text as captured, plus optional normalized FK
  collection_location: optionalText,
  collection_location_id: optionalUuid,
  collection_contact: optionalText,
  collection_phone: optionalText,
  current_location: optionalText,
  current_location_id: optionalUuid,
  arrival_date: optionalDate,

  // Financial — retail_value, insurance_amount and commission_rate_percent
  // are the three typed inputs; commission, total_comms_incl_vat,
  // insurance_inv_to_mssa and salvage_percentage are computed server-side
  // from those three (lib/commission.ts) and are never submitted directly.
  retail_value: optionalNumber("Retail value", { min: 0 }),
  insurance_amount: optionalNumber("Insurance amount", { min: 0 }),
  commission_rate_percent: optionalNumber("Commission rate", { min: 0, max: 100 }),
  insurance_invoice_no: optionalText,
  estimator_cost: optionalNumber("Estimator cost", { min: 0 }),

  // Sale
  sold_to: optionalText,
  selling_amount: optionalNumber("Selling amount", { min: 0 }),

  // Upliftment
  transporter_id: optionalUuid,
  transport_contact_person: optionalText,
  transport_contact_number: optionalText,
  upliftment_date: optionalDate,
  upliftment_time: optionalText,
  upliftment_sent_date: optionalDate,
  upliftment_received_date: optionalDate,
  pickup_address: optionalText,
  delivery_address: optionalText,
  upliftment_notes: optionalText,

  // Administrative
  date_received: optionalDate,
  assigned_to: optionalUuid,
  notes: optionalText,
});

/** Values after Zod coercion — what actually gets written to Supabase. */
export type BikeFormValues = z.output<typeof bikeFormSchema>;
/** Values before coercion — what the form inputs hold (all strings). */
export type BikeFormInput = z.input<typeof bikeFormSchema>;

/**
 * Blank form state, and the canonical list of fields the form binds to.
 *
 * This lives here rather than alongside the form component because Server
 * Components read it (to seed edit defaults). A non-component value exported
 * from a `"use client"` module arrives on the server as a client-reference
 * proxy, not the real object — so `key in EMPTY_BIKE_FORM` silently returns
 * false for everything and the edit form renders blank.
 */
export const EMPTY_BIKE_FORM: BikeFormInput = {
  stock_number: "",
  claim_number: "",
  status: "new_instruction",
  insurance_company_id: "",
  broker: "",
  claims_handler: "",
  salvage_clerk: "",
  make: "",
  model: "",
  year: "",
  engine_capacity_cc: "",
  registration_number: "",
  vin_number: "",
  engine_number: "",
  keys_status: "",
  write_off_code: "",
  loss_date: "",
  collection_location: "",
  collection_location_id: "",
  collection_contact: "",
  collection_phone: "",
  current_location: "",
  current_location_id: "",
  arrival_date: "",
  retail_value: "",
  insurance_amount: "",
  commission_rate_percent: "",
  insurance_invoice_no: "",
  estimator_cost: "",
  sold_to: "",
  selling_amount: "",
  transporter_id: "",
  transport_contact_person: "",
  transport_contact_number: "",
  upliftment_date: "",
  upliftment_time: "",
  upliftment_sent_date: "",
  upliftment_received_date: "",
  pickup_address: "",
  delivery_address: "",
  upliftment_notes: "",
  date_received: "",
  assigned_to: "",
  notes: "",
};
