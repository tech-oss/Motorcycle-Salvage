import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateInstructionButton } from "@/components/upliftments/generate-instruction-button";
import { getBikeByStockNumber } from "@/services/bikes";
import { getCurrentProfile, canWrite } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

export default async function UpliftmentInstructionPage({
  params,
}: PageProps<"/bikes/[stockNumber]/upliftment-instruction">) {
  const { stockNumber } = await params;
  const [bike, profile] = await Promise.all([
    getBikeByStockNumber(stockNumber),
    getCurrentProfile(),
  ]);

  if (!bike) notFound();

  const editable = canWrite(profile);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/bikes" className="hover:text-foreground">
          Salvage Bikes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <Link href={`/bikes/${bike.stockNumber}`} className="hover:text-foreground">
          {bike.stockNumber}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">Upliftment Instruction</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Upliftment Instruction
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-populated from this bike&apos;s record — nothing here needs
            re-typing.
          </p>
        </div>
        {editable && (
          <GenerateInstructionButton bikeId={bike.id} stockNumber={bike.stockNumber} />
        )}
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Claim &amp; Insurance</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <Row label="Claim Number" value={dash(bike.claimNumber)} />
          <Row label="Insurer" value={dash(bike.insuranceCompany)} />
          <Row label="Write-off Code" value={dash(bike.writeOffCode)} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Motorcycle</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <Row
            label="Make / Model"
            value={dash([bike.make, bike.model].filter(Boolean).join(" "))}
          />
          <Row label="Year" value={dash(bike.year)} />
          <Row label="Registration" value={dash(bike.registrationNumber)} />
          <Row label="VIN" value={dash(bike.vin)} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Transporter &amp; Dates</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <Row label="Transporter" value={dash(bike.transporter)} />
          <Row label="Contact Person" value={dash(bike.transportContactPerson)} />
          <Row label="Contact Number" value={dash(bike.transportContactNumber)} />
          <Row label="Upliftment Date" value={formatDate(bike.upliftmentDate)} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Collection &amp; Delivery</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <Row
            label="Pickup Address"
            value={dash(bike.pickupAddress ?? bike.collectionLocation)}
          />
          <Row label="Delivery Address" value={dash(bike.deliveryAddress)} />
          {bike.upliftmentNotes && <Row label="Notes" value={bike.upliftmentNotes} />}
        </CardContent>
      </Card>

      {!bike.transporter && !bike.pickupAddress && !bike.upliftmentDate && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          This bike has no transporter or upliftment details yet. You can still
          generate a PDF, but it will show blanks until you fill those in on the
          bike&apos;s edit form.
        </p>
      )}
    </div>
  );
}
