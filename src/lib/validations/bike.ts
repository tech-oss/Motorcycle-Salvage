import { z } from "zod";

/**
 * Validation for the salvage bike form.
 *
 * Deliberately permissive beyond `stock_number`. Salvage instructions arrive
 * incomplete — a bike often lands with a claim number and nothing else, and
 * the rest is filled in over days as the assessor and transporter report back.
 * Forcing fields the client doesn't have yet would push staff back to Excel,
 * which is the exact problem this replaces (PROJECT_SCOPE §3).
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
  file_number: optionalText,
  claim_number: optionalText,
  status: z.string().trim().min(1, "Status is required"),

  // Insurance
  insurance_company_id: optionalUuid,
  broker: optionalText,
  assessor: optionalText,
  assessor_contact: optionalText,
  insured_name: optionalText,
  insured_address: optionalText,
  insured_phone: optionalText,
  insured_email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address",
    }),

  // Motorcycle
  make: optionalText,
  model: optionalText,
  year: optionalNumber("Year", { min: 1900, max: 2100 }),
  registration_number: optionalText,
  vin_number: optionalText,
  odometer: optionalNumber("Odometer", { min: 0 }),
  colour: optionalText,
  engine_number: optionalText,
  keys_status: optionalEnum(["yes", "no", "tbc"] as const),
  write_off_code: optionalText,
  loss_date: optionalDate,

  // Condition
  pre_accident_condition: optionalText,
  severity_of_impact: optionalText,
  pre_accident_damage: optionalText,
  tyre_condition: optionalText,
  tyre_depth_left_front: optionalNumber("Tyre depth", { min: 0, max: 30 }),
  tyre_depth_right_front: optionalNumber("Tyre depth", { min: 0, max: 30 }),
  tyre_depth_left_rear: optionalNumber("Tyre depth", { min: 0, max: 30 }),
  tyre_depth_right_rear: optionalNumber("Tyre depth", { min: 0, max: 30 }),

  // Location — free text as captured, plus optional normalized FK
  collection_location: optionalText,
  collection_location_id: optionalUuid,
  collection_contact: optionalText,
  collection_phone: optionalText,
  delivery_location: optionalText,
  delivery_location_id: optionalUuid,
  current_location: optionalText,
  current_location_id: optionalUuid,
  storage_location: optionalText,
  storage_location_id: optionalUuid,

  // Financial
  retail_value: optionalNumber("Retail value", { min: 0 }),
  salvage_value: optionalNumber("Salvage value", { min: 0 }),
  salvage_percentage: optionalNumber("Salvage percentage", { min: 0, max: 100 }),
  mssa_commission: optionalNumber("Commission", { min: 0 }),
  release_fee: optionalNumber("Release fee", { min: 0 }),
  release_payment_date: optionalDate,
  total_loss: z.boolean(),
  estimator_cost: optionalNumber("Estimator cost", { min: 0 }),

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
  file_number: "",
  claim_number: "",
  status: "new_instruction",
  insurance_company_id: "",
  broker: "",
  assessor: "",
  assessor_contact: "",
  insured_name: "",
  insured_address: "",
  insured_phone: "",
  insured_email: "",
  make: "",
  model: "",
  year: "",
  registration_number: "",
  vin_number: "",
  odometer: "",
  colour: "",
  engine_number: "",
  keys_status: "",
  write_off_code: "",
  loss_date: "",
  pre_accident_condition: "",
  severity_of_impact: "",
  pre_accident_damage: "",
  tyre_condition: "",
  tyre_depth_left_front: "",
  tyre_depth_right_front: "",
  tyre_depth_left_rear: "",
  tyre_depth_right_rear: "",
  collection_location: "",
  collection_location_id: "",
  collection_contact: "",
  collection_phone: "",
  delivery_location: "",
  delivery_location_id: "",
  current_location: "",
  current_location_id: "",
  storage_location: "",
  storage_location_id: "",
  retail_value: "",
  salvage_value: "",
  salvage_percentage: "",
  mssa_commission: "",
  release_fee: "",
  release_payment_date: "",
  total_loss: false,
  estimator_cost: "",
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
