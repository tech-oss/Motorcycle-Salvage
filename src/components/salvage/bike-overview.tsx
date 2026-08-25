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

const percent = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}%`);

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
              ["CC", dash(bike.engineCapacityCc)],
              ["Engine No.", dash(bike.engineNumber)],
              ["VIN", dash(bike.vin)],
              ["Registration", dash(bike.registrationNumber)],
              ["Keys", bike.keysStatus ? KEYS_LABELS[bike.keysStatus] : "—"],
              ["Write-off Code", dash(bike.writeOffCode)],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">
            Insurance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Insurance", dash(bike.insuranceCompany)],
              ["Broker", dash(bike.broker)],
              ["Claims Handler", dash(bike.claimsHandler)],
              ["Salvage Clerk", dash(bike.salvageClerk)],
              ["Claim No.", dash(bike.claimNumber)],
              ["Loss Date", formatDate(bike.lossDate)],
              ["Insurance Invoice No.", dash(bike.insuranceInvoiceNo)],
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
              ["Store", dash(bike.currentLocation)],
              ["Arrival Date", formatDate(bike.arrivalDate)],
              ["Sold To", dash(bike.soldTo)],
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
              ["Insurance Amount", money(bike.insuranceAmount)],
              [
                "Commission Rate",
                bike.commissionRatePercent !== null
                  ? `${bike.commissionRatePercent}%`
                  : "—",
              ],
              ["Commission", money(bike.commission)],
              ["Total Comms incl VAT", money(bike.totalCommsInclVat)],
              ["Insurance Inv to MSSA", money(bike.insuranceInvToMssa)],
              ["% After Commission", percent(bike.salvagePercentage)],
              ["Estimator Cost", money(bike.estimatorCost)],
              ["Selling Amount", money(bike.sellingAmount)],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
