import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBikeByStockNumber } from "@/services/bikes";
import { generateBikeQrDataUrl, bikeRecordUrl } from "@/lib/qr/generate";
import { QrDownloadButtons } from "@/components/salvage/qr-download-buttons";
import { describeBike } from "@/lib/utils";

export default async function QrCodePage({
  params,
}: PageProps<"/bikes/[stockNumber]/qr-code">) {
  const { stockNumber } = await params;
  const bike = await getBikeByStockNumber(stockNumber);

  if (!bike) notFound();

  const qrDataUrl = await generateBikeQrDataUrl(bike.stockNumber);
  const targetUrl = bikeRecordUrl(bike.stockNumber);
  const makeModel = describeBike({ make: bike.make, model: bike.model });

  const details: Array<[string, string]> = [
    ["Stock Number", bike.stockNumber],
    ["Make / Model", makeModel],
    ["Year", bike.year ? String(bike.year) : "—"],
    ["Size", "70mm x 50mm"],
  ];

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
        <span className="text-foreground">QR Code</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            QR Code Sticker — {bike.stockNumber}
          </h2>
          <p className="text-sm text-muted-foreground">
            Print or download the QR code sticker for this bike.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Printer className="size-4" aria-hidden="true" />
          Print
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="py-6">
          <CardContent className="flex justify-center px-6">
            <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-white p-6 text-center text-[#071018]">
              <div>
                <p className="text-sm font-bold tracking-wide uppercase">
                  Motorcycle Salvage
                </p>
                <p className="text-[10px] font-medium tracking-[0.2em] text-[#b3822a] uppercase">
                  South Africa
                </p>
              </div>

              <Image
                src={qrDataUrl}
                alt={`QR code linking to bike record ${bike.stockNumber}`}
                width={200}
                height={200}
                unoptimized
                className="size-50"
              />

              <dl className="w-full text-left text-xs">
                <div className="flex justify-between border-b border-black/10 py-1">
                  <dt className="text-black/50">Stock No.</dt>
                  <dd className="font-semibold">{bike.stockNumber}</dd>
                </div>
                <div className="flex justify-between border-b border-black/10 py-1">
                  <dt className="text-black/50">Make / Model</dt>
                  <dd className="font-semibold">{makeModel}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-black/50">Year</dt>
                  <dd className="font-semibold">{bike.year ?? "—"}</dd>
                </div>
              </dl>

              <p className="w-full rounded bg-[#071018] py-2 text-[11px] font-semibold tracking-wide text-white uppercase">
                Scan to view bike details
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm text-muted-foreground">
                Sticker Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <dl className="flex flex-col gap-3 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm text-muted-foreground">
                Download Options
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <QrDownloadButtons
                dataUrl={qrDataUrl}
                stockNumber={bike.stockNumber}
              />
            </CardContent>
          </Card>

          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" aria-hidden="true" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-5 text-sm text-muted-foreground">
              <p>
                Scanning this QR code with any smartphone opens this bike&apos;s
                record.
              </p>
              <p>Login is required to access the full information.</p>
              <p className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs break-all text-foreground">
                {targetUrl}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
