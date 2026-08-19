import { Bike as BikeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, describeBike } from "@/lib/utils";
import type { Bike } from "@/types/bike";

export function BikePhotoPanel({ bike }: { bike: Bike }) {
  const facts: Array<[string, string]> = [
    ["Claim Number", bike.claimNumber ?? "—"],
    ["Insurance Company", bike.insuranceCompany ?? "—"],
    ["Loss Date", formatDate(bike.lossDate)],
    ["VIN Number", bike.vin ?? "—"],
    ["Registration", bike.registrationNumber ?? "—"],
    [
      "Odometer",
      bike.odometer !== null ? `${bike.odometer.toLocaleString("en-ZA")} km` : "—",
    ],
  ];

  return (
    <Card className="gap-4 py-5">
      <CardContent className="flex flex-col gap-4 px-5">
        {/* Photos live in a private bucket, so a thumbnail needs a signed URL.
            Until upload is wired up this stays a placeholder rather than a
            broken <img>. */}
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-border bg-gradient-to-br from-secondary to-muted">
          <BikeIcon className="size-14 text-muted-foreground/40" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {describeBike({ make: bike.make, model: bike.model })}
          </h3>
          <p className="text-sm text-muted-foreground">{bike.year ?? "—"}</p>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-all text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
