import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BikeForm } from "@/components/salvage/bike-form";
import { EMPTY_BIKE_FORM } from "@/lib/validations/bike";
import { getBikeFormReferenceData } from "@/services/reference";
import { getCurrentProfile, canWrite } from "@/lib/supabase/auth";

export default async function NewBikePage() {
  const profile = await getCurrentProfile();

  // Viewers have no create path; bounce rather than render a form whose
  // submit RLS would reject anyway.
  if (!canWrite(profile)) redirect("/bikes");

  const reference = await getBikeFormReferenceData();

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/bikes" className="hover:text-foreground">
          Salvage Bikes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">New Instruction</span>
      </nav>

      <div>
        <h2 className="text-xl font-semibold text-foreground">
          New Salvage Instruction
        </h2>
        <p className="text-sm text-muted-foreground">
          Only the stock number is required — the rest can be filled in as the
          assessor and transporter report back.
        </p>
      </div>

      <BikeForm
        reference={reference}
        defaultValues={EMPTY_BIKE_FORM}
        cancelHref="/bikes"
      />
    </div>
  );
}
