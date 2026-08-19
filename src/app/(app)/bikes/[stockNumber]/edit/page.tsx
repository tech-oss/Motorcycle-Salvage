import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BikeForm } from "@/components/salvage/bike-form";
import { getBikeForEdit } from "@/services/bikes";
import { getBikeFormReferenceData } from "@/services/reference";
import { getCurrentProfile, canWrite } from "@/lib/supabase/auth";
import { EMPTY_BIKE_FORM, type BikeFormInput } from "@/lib/validations/bike";

export default async function EditBikePage({
  params,
}: PageProps<"/bikes/[stockNumber]/edit">) {
  const { stockNumber } = await params;
  const profile = await getCurrentProfile();

  if (!canWrite(profile)) redirect(`/bikes/${stockNumber}`);

  const [bike, reference] = await Promise.all([
    getBikeForEdit(stockNumber),
    getBikeFormReferenceData(),
  ]);

  if (!bike) notFound();

  // Start from the empty shape so every field the form binds to is present,
  // even if the schema gains a column the stored row predates.
  const defaultValues = {
    ...EMPTY_BIKE_FORM,
    ...Object.fromEntries(
      Object.entries(bike.values).filter(([key]) => key in EMPTY_BIKE_FORM)
    ),
  } as BikeFormInput;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/bikes" className="hover:text-foreground">
          Salvage Bikes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <Link
          href={`/bikes/${bike.values.stock_number}`}
          className="hover:text-foreground"
        >
          {String(bike.values.stock_number)}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">Edit</span>
      </nav>

      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Edit {String(bike.values.stock_number)}
        </h2>
        <p className="text-sm text-muted-foreground">
          Changes are recorded in this bike&apos;s history.
        </p>
      </div>

      <BikeForm
        reference={reference}
        defaultValues={defaultValues}
        bikeId={bike.id}
        cancelHref={`/bikes/${bike.values.stock_number}`}
      />
    </div>
  );
}
