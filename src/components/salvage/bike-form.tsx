"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormError } from "@/components/auth/form-feedback";
import {
  Section,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
} from "./bike-form-fields";
import { bikeFormSchema, type BikeFormInput } from "@/lib/validations/bike";
import { createBike, updateBike } from "@/app/(app)/bikes/actions";
import type { BikeFormReferenceData } from "@/services/reference";

const KEYS_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "tbc", label: "TBC" },
];


export function BikeForm({
  reference,
  defaultValues,
  bikeId,
  cancelHref,
}: {
  reference: BikeFormReferenceData;
  defaultValues: BikeFormInput;
  /** Present when editing; absent when creating. */
  bikeId?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm<BikeFormInput>({
    resolver: zodResolver(bikeFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const toOptions = (rows: { id: string; name: string }[]) =>
    rows.map((r) => ({ value: r.id, label: r.name }));

  const locationOptions = toOptions(reference.locations);

  function onSubmit(values: BikeFormInput) {
    setFormError(undefined);

    startTransition(async () => {
      const result = bikeId
        ? await updateBike(bikeId, values)
        : await createBike(values);

      if (result.error) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.fieldErrors) {
        // Server-side validation disagreed with the client. Surface it on the
        // offending fields rather than as a generic banner.
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof BikeFormInput, {
            message: messages[0],
          });
        }
        setFormError("Please correct the highlighted fields.");
        return;
      }

      toast.success(
        bikeId
          ? `${result.savedStockNumber} updated.`
          : `${result.savedStockNumber} created.`
      );
      router.push(`/bikes/${result.savedStockNumber}`);
      router.refresh();
    });
  }

  /** Focus the first invalid field so keyboard users aren't stranded. */
  function onInvalid() {
    setFormError("Please correct the highlighted fields.");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormError message={formError} />

        <Section
          title="Identification"
          description="Stock number is the business key used for QR codes and import duplicate detection."
        >
          <TextField
            control={form.control}
            name="stock_number"
            label="Stock Number"
            placeholder="M01187"
            required
          />
          <TextField
            control={form.control}
            name="file_number"
            label="File Number"
          />
          <TextField
            control={form.control}
            name="claim_number"
            label="Claim Number"
          />
          <SelectField
            control={form.control}
            name="status"
            label="Status"
            required
            allowEmpty={false}
            options={reference.statuses.map((s) => ({
              value: s.code,
              label: s.label,
            }))}
          />
          <TextField
            control={form.control}
            name="date_received"
            label="Date Received"
            type="date"
          />
          <SelectField
            control={form.control}
            name="assigned_to"
            label="Assigned To"
            options={toOptions(reference.users)}
            placeholder="Unassigned"
          />
        </Section>

        <Section title="Insurance & Assessor">
          <SelectField
            control={form.control}
            name="insurance_company_id"
            label="Insurance Company"
            options={toOptions(reference.insurers)}
          />
          <TextField control={form.control} name="broker" label="Broker" />
          <TextField control={form.control} name="assessor" label="Assessor" />
          <TextField
            control={form.control}
            name="assessor_contact"
            label="Assessor Contact"
            inputMode="tel"
          />
          <TextField
            control={form.control}
            name="insured_name"
            label="Insured Name"
          />
          <TextField
            control={form.control}
            name="insured_phone"
            label="Insured Phone"
            inputMode="tel"
          />
          <TextField
            control={form.control}
            name="insured_email"
            label="Insured Email"
            type="email"
            inputMode="email"
          />
          <TextAreaField
            control={form.control}
            name="insured_address"
            label="Insured Address"
            className="sm:col-span-2"
          />
        </Section>

        <Section title="Motorcycle">
          <TextField control={form.control} name="make" label="Make" />
          <TextField control={form.control} name="model" label="Model" />
          <TextField
            control={form.control}
            name="year"
            label="Year"
            inputMode="numeric"
            placeholder="2012"
          />
          <TextField
            control={form.control}
            name="registration_number"
            label="Registration Number"
          />
          <TextField control={form.control} name="vin_number" label="VIN" />
          <TextField
            control={form.control}
            name="odometer"
            label="Odometer (km)"
            inputMode="numeric"
          />
          <TextField control={form.control} name="colour" label="Colour" />
          <TextField
            control={form.control}
            name="engine_number"
            label="Engine Number"
          />
          <SelectField
            control={form.control}
            name="keys_status"
            label="Keys"
            options={KEYS_OPTIONS}
          />
          <TextField
            control={form.control}
            name="write_off_code"
            label="Write-off Code"
            placeholder="Code 2"
          />
          <TextField
            control={form.control}
            name="loss_date"
            label="Loss Date"
            type="date"
          />
        </Section>

        <Section title="Condition">
          <TextField
            control={form.control}
            name="pre_accident_condition"
            label="Pre-accident Condition"
          />
          <TextField
            control={form.control}
            name="severity_of_impact"
            label="Severity of Impact"
          />
          <TextField
            control={form.control}
            name="tyre_condition"
            label="Tyre Condition"
          />
          <TextAreaField
            control={form.control}
            name="pre_accident_damage"
            label="Pre-accident Damage"
            className="sm:col-span-2 lg:col-span-3"
          />
          <TextField
            control={form.control}
            name="tyre_depth_left_front"
            label="Tyre Depth — Left Front (mm)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="tyre_depth_right_front"
            label="Tyre Depth — Right Front (mm)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="tyre_depth_left_rear"
            label="Tyre Depth — Left Rear (mm)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="tyre_depth_right_rear"
            label="Tyre Depth — Right Rear (mm)"
            inputMode="decimal"
          />
        </Section>

        <Section
          title="Location"
          description="Free-text addresses are captured as-is; the linked location powers reporting."
        >
          <TextField
            control={form.control}
            name="collection_location"
            label="Collection Address"
          />
          <TextField
            control={form.control}
            name="collection_contact"
            label="Collection Contact"
          />
          <TextField
            control={form.control}
            name="collection_phone"
            label="Collection Phone"
            inputMode="tel"
          />
          <TextField
            control={form.control}
            name="delivery_location"
            label="Delivery Address"
          />
          <SelectField
            control={form.control}
            name="current_location_id"
            label="Current Location"
            options={locationOptions}
          />
          <SelectField
            control={form.control}
            name="storage_location_id"
            label="Storage Location"
            options={locationOptions}
          />
        </Section>

        <Section title="Financial">
          <TextField
            control={form.control}
            name="retail_value"
            label="Retail Value (R)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="salvage_value"
            label="Salvage Value (R)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="salvage_percentage"
            label="Salvage %"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="mssa_commission"
            label="Commission (R)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="release_fee"
            label="Release Fee (R)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="estimator_cost"
            label="Estimator Cost (R)"
            inputMode="decimal"
          />
          <TextField
            control={form.control}
            name="release_payment_date"
            label="Release Payment Date"
            type="date"
          />
          <CheckboxField
            control={form.control}
            name="total_loss"
            label="Total loss"
          />
        </Section>

        <Section title="Upliftment">
          <SelectField
            control={form.control}
            name="transporter_id"
            label="Transporter"
            options={toOptions(reference.transporters)}
          />
          <TextField
            control={form.control}
            name="transport_contact_person"
            label="Contact Person"
          />
          <TextField
            control={form.control}
            name="transport_contact_number"
            label="Contact Number"
            inputMode="tel"
          />
          <TextField
            control={form.control}
            name="upliftment_date"
            label="Upliftment Date"
            type="date"
          />
          <TextField
            control={form.control}
            name="upliftment_time"
            label="Upliftment Time"
            type="time"
          />
          <TextField
            control={form.control}
            name="upliftment_sent_date"
            label="Instruction Sent"
            type="date"
          />
          <TextField
            control={form.control}
            name="upliftment_received_date"
            label="Instruction Received"
            type="date"
          />
          <TextField
            control={form.control}
            name="pickup_address"
            label="Pickup Address"
          />
          <TextField
            control={form.control}
            name="delivery_address"
            label="Delivery Address"
          />
          <TextAreaField
            control={form.control}
            name="upliftment_notes"
            label="Upliftment Notes"
            className="sm:col-span-2 lg:col-span-3"
          />
        </Section>

        <Section title="Notes">
          <TextAreaField
            control={form.control}
            name="notes"
            label="Internal Notes"
            className="sm:col-span-2 lg:col-span-3"
          />
        </Section>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background/95 py-4 backdrop-blur">
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {isPending
              ? "Saving…"
              : bikeId
                ? "Save changes"
                : "Create bike"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
