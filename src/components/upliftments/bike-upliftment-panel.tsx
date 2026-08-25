import Link from "next/link";
import { Printer, ClipboardList, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/utils";
import { UPLIFTMENT_STATUS_LABELS } from "@/lib/status";
import type { Bike } from "@/types/bike";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

const dash = (v: string | null | undefined) => (v?.trim() ? v : "—");

export function BikeUpliftmentPanel({
  bike,
  instructionUrls = {},
}: {
  bike: Bike;
  /** storagePath -> signed URL, for downloading past generated PDFs. */
  instructionUrls?: Record<string, string>;
}) {
  const hasCurrent =
    bike.transporter ||
    bike.upliftmentDate ||
    bike.pickupAddress ||
    bike.deliveryAddress;

  return (
    <div className="flex flex-col gap-4">
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
          {hasCurrent ? (
            <>
              <Row label="Transporter" value={dash(bike.transporter)} />
              <Row label="Contact Person" value={dash(bike.transportContactPerson)} />
              <Row label="Contact Number" value={dash(bike.transportContactNumber)} />
              <Row label="Upliftment Date" value={formatDate(bike.upliftmentDate)} />
              <Row
                label="Pickup Address"
                value={dash(bike.pickupAddress ?? bike.collectionLocation)}
              />
              <Row label="Delivery Address" value={dash(bike.deliveryAddress)} />
              {bike.upliftmentNotes && (
                <Row label="Notes" value={bike.upliftmentNotes} />
              )}
            </>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No upliftment arranged"
              description="Assign a transporter and dates on this bike, then generate the instruction PDF."
            />
          )}
        </CardContent>
      </Card>

      {bike.upliftments.length > 0 && (
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">
              Instruction History ({bike.upliftments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5">
            {bike.upliftments.map((u) => {
              const downloadUrl = u.documentPath
                ? instructionUrls[u.documentPath]
                : undefined;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {UPLIFTMENT_STATUS_LABELS[u.status]}
                    </Badge>
                    <span className="text-foreground">
                      {dash(u.transporterName)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatDate(u.upliftmentDate)}
                    </span>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
