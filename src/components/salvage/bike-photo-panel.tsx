import { Bike as BikeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, describeBike } from "@/lib/utils";
import type { Bike } from "@/types/bike";

export function BikePhotoPanel({
  bike,
  coverUrl,
}: {
  bike: Bike;
  /** Signed URL for the first photo, if the bike has one. */
  coverUrl?: string;
}) {
  const facts: Array<[string, string]> = [
    ["Claim Number", bike.claimNumber ?? "—"],
    ["Insurance Company", bike.insuranceCompany ?? "—"],
    ["Loss Date", formatDate(bike.lossDate)],
    ["VIN Number", bike.vin ?? "—"],
    ["Registration", bike.registrationNumber ?? "—"],
  ];

  return (
    <Card className="gap-4 py-5">
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-secondary to-muted">
          {coverUrl ? (
            /* Signed URLs expire; Next's optimizer would cache one that later
               403s, so this stays a plain img. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverUrl}
              alt={`${describeBike({ make: bike.make, model: bike.model })} photo`}
              className="size-full object-cover"
            />
          ) : (
            <BikeIcon
              className="size-14 text-muted-foreground/40"
              aria-hidden="true"
            />
          )}
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
