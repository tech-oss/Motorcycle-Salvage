"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canWrite, isAdmin } from "@/lib/supabase/auth";
import { bikeFormSchema, type BikeFormInput, type BikeFormValues } from "@/lib/validations/bike";
import { computeCommissionChain } from "@/lib/commission";

export type BikeActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Stock number of the saved record — the caller navigates to it. */
  savedStockNumber?: string;
};

/**
 * Postgres error codes we can explain better than the raw driver message.
 * 23505 = unique_violation, 23503 = foreign_key_violation.
 */
function describeDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505" && error.message.includes("stock_number")) {
    return "That stock number is already in use. Stock numbers must be unique.";
  }
  if (error.code === "23503") {
    return "A selected insurer, transporter, location or user no longer exists. Reload and try again.";
  }
  // RLS rejection surfaces as an empty result or a permission error rather
  // than a constraint code.
  if (error.code === "42501") {
    return "You do not have permission to save this record.";
  }
  return `Could not save: ${error.message}`;
}

/**
 * Adds the computed commission chain to a validated form payload.
 *
 * Recomputed here rather than trusted from the client — the browser only
 * shows a live preview for staff feedback, this is the number that's
 * actually persisted, so a tampered or stale client value can never reach
 * the database.
 */
function withCommissionChain(values: BikeFormValues) {
  const { commission, totalCommsInclVat, insuranceInvToMssa, percentageAfterCommission } =
    computeCommissionChain({
      retailValue: values.retail_value,
      insuranceAmount: values.insurance_amount,
      commissionRatePercent: values.commission_rate_percent,
    });

  return {
    ...values,
    mssa_commission: commission,
    total_comms_incl_vat: totalCommsInclVat,
    insurance_inv_to_mssa: insuranceInvToMssa,
    salvage_percentage: percentageAfterCommission,
  };
}

export async function createBike(
  values: BikeFormInput
): Promise<BikeActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to create bikes." };
  }

  const parsed = bikeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .insert(withCommissionChain(parsed.data))
    .select("stock_number")
    .single();

  if (error) return { error: describeDbError(error) };

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  return { savedStockNumber: data.stock_number };
}

export async function updateBike(
  id: string,
  values: BikeFormInput
): Promise<BikeActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to edit bikes." };
  }

  const parsed = bikeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .update(withCommissionChain(parsed.data))
    .eq("id", id)
    .select("stock_number")
    .maybeSingle();

  if (error) return { error: describeDbError(error) };

  // No row came back: RLS filtered the update out, or the record is gone.
  // Reporting success here would be a lie the user acts on.
  if (!data) {
    return {
      error:
        "That bike could not be updated — it may have been deleted, or you may not have permission.",
    };
  }

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  revalidatePath(`/bikes/${data.stock_number}`);
  return { savedStockNumber: data.stock_number };
}

/**
 * Archiving is the staff-safe alternative to deletion: the record stays
 * auditable and the archive/restore is written to audit_logs by trigger.
 */
export async function setBikeArchived(
  id: string,
  archived: boolean
): Promise<BikeActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to change this bike." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .update({ archived })
    .eq("id", id)
    .select("stock_number")
    .maybeSingle();

  if (error) return { error: describeDbError(error) };
  if (!data) {
    return { error: "That bike could not be updated." };
  }

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  revalidatePath(`/bikes/${data.stock_number}`);
  return { savedStockNumber: data.stock_number };
}

/** Hard delete — admin only, matching the RLS policy. */
export async function deleteBike(id: string): Promise<BikeActionState> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "Only an administrator can delete a bike record." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("salvage_bikes").delete().eq("id", id);

  if (error) return { error: describeDbError(error) };

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  return {};
}
