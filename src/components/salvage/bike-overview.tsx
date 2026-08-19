import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyZAR, formatDate } from "@/lib/utils";
import type { Bike } from "@/types/bike";

const KEYS_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  tbc: "TBC",
};

function InfoList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium break-words text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const money = (v: number | null) => (v === null ? "—" : formatCurrencyZAR(v));

export function BikeOverview({ bike }: { bike: Bike }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Make", dash(bike.make)],
              ["Model", dash(bike.model)],
              ["Year", dash(bike.year)],
              ["Colour", dash(bike.colour)],
              ["Engine No.", dash(bike.engineNumber)],
              ["VIN", dash(bike.vin)],
              ["Registration", dash(bike.registrationNumber)],
              [
                "Odometer",
                bike.odometer !== null
                  ? `${bike.odometer.toLocaleString("en-ZA")} km`
                  : "—",
              ],
              ["Keys", bike.keysStatus ? KEYS_LABELS[bike.keysStatus] : "—"],
              ["Write-off Code", dash(bike.writeOffCode)],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">
            Insurance / Assessor
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Insurance", dash(bike.insuranceCompany)],
              ["Broker", dash(bike.broker)],
              ["Assessor", dash(bike.assessor)],
              ["Contact", dash(bike.assessorContact)],
              ["Claim No.", dash(bike.claimNumber)],
              ["Loss Date", formatDate(bike.lossDate)],
              ["Insured", dash(bike.insuredName)],
              ["Phone", dash(bike.insuredPhone)],
              ["Email", dash(bike.insuredEmail)],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">Location</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Collection", dash(bike.collectionLocation)],
              ["Contact", dash(bike.collectionContact)],
              ["Phone", dash(bike.collectionPhone)],
              ["Delivery", dash(bike.deliveryLocation)],
              ["Current Location", dash(bike.currentLocation)],
              ["Storage", dash(bike.storageLocation)],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Retail Value", money(bike.retailValue)],
              ["Salvage Value", money(bike.salvageValue)],
              [
                "Salvage %",
                bike.salvagePercentage !== null
                  ? `${bike.salvagePercentage}%`
                  : "—",
              ],
              ["Commission", money(bike.commission)],
              ["Release Fee", money(bike.releaseFee)],
              ["Estimator Cost", money(bike.estimatorCost)],
              ["Total Loss", bike.totalLoss ? "Yes" : "No"],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
