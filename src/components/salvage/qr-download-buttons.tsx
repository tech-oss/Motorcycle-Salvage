"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrDownloadButtons({
  dataUrl,
  stockNumber,
}: {
  dataUrl: string;
  stockNumber: string;
}) {
  function downloadPng() {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${stockNumber}-qr.png`;
    link.click();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={downloadPng} className="w-full gap-2">
        <Download className="size-4" aria-hidden="true" />
        Download PNG
      </Button>
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="w-full gap-2"
      >
        <FileText className="size-4" aria-hidden="true" />
        Download PDF
      </Button>
    </div>
  );
}
