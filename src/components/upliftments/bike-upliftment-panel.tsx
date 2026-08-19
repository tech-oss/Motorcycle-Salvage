import Link from "next/link";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Bike } from "@/types/bike";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function BikeUpliftmentPanel({ bike }: { bike: Bike }) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex items-center justify-between px-5">
        <CardTitle className="text-base">Upliftment Instruction</CardTitle>
        <Button asChild size="sm" className="gap-2">
          <Link href={`/bikes/${bike.stockNumber}/upliftment-instruction`}>
            <Printer className="size-4" aria-hidden="true" />
            Generate PDF
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5">
        <Row label="Transporter" value={bike.transporter} />
        <Row label="Contact Person" value={bike.transporterContact} />
        <Row label="Contact Number" value={bike.transporterPhone} />
        <Row
          label="Upliftment Date"
          value={bike.upliftmentDate ? formatDate(bike.upliftmentDate) : "Not scheduled"}
        />
        <Row label="Pickup Address" value={bike.collectionLocation} />
        <Row label="Delivery Address" value={bike.deliveryLocation} />
      </CardContent>
    </Card>
  );
}
