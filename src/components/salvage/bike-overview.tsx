import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bike } from "@/types/bike";

function InfoList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium break-words text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BikeOverview({ bike }: { bike: Bike }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm text-muted-foreground">
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <InfoList
            rows={[
              ["Make", bike.make],
              ["Model", bike.model],
              ["Year", String(bike.year)],
              ["Colour", bike.colour],
              ["Engine No.", bike.engineNumber],
              ["VIN", bike.vin],
              ["Registration", bike.registrationNumber],
              ["Odometer", `${bike.odometer.toLocaleString()} km`],
              ["Keys", bike.keysStatus],
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
              ["Insurance", bike.insuranceCompany],
              ["Broker", bike.broker],
              ["Assessor", bike.assessor],
              ["Contact", bike.assessorContact],
              ["Insured", bike.insuredName],
              ["Email", bike.insuredEmail],
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
              ["Collection", bike.collectionLocation],
              ["Delivery", bike.deliveryLocation],
              ["Current Location", bike.currentLocation],
              ["Storage", bike.storageLocation],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
