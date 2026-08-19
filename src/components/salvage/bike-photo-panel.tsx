import { Bike as BikeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Bike } from "@/types/bike";

export function BikePhotoPanel({ bike }: { bike: Bike }) {
  const facts: Array<[string, string]> = [
    ["Claim Number", bike.claimNumber],
    ["Insurance Company", bike.insuranceCompany],
    ["Loss Date", formatDate(bike.lossDate)],
    ["VIN Number", bike.vin],
    ["Registration", bike.registrationNumber],
    ["Odometer", `${bike.odometer.toLocaleString()} km`],
  ];

  return (
    <Card className="gap-4 py-5">
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-border bg-gradient-to-br from-secondary to-muted">
          <BikeIcon className="size-14 text-muted-foreground/40" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {bike.make} {bike.model}
          </h3>
          <p className="text-sm text-muted-foreground">{bike.year}</p>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
