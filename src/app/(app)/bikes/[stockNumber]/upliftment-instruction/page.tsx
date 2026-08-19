import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Printer } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { getBikeByStockNumber } from "@/services/bikes";

export default async function UpliftmentInstructionPage({
  params,
}: PageProps<"/bikes/[stockNumber]/upliftment-instruction">) {
  const { stockNumber } = await params;
  const bike = await getBikeByStockNumber(stockNumber);

  if (!bike) notFound();

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

      <ModulePlaceholder
        title={`Upliftment Instruction — ${bike.stockNumber}`}
        description="Auto-populated, printable PDF generation from this bike's transporter, contact and address fields (PROJECT_SCOPE §14) lands with the PDF generation feature."
        icon={Printer}
      />
    </div>
  );
}
