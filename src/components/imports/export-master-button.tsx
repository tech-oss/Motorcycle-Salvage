"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Downloads the Excel master. Fetched rather than linked so a failure shows a
 * toast instead of navigating the user to an error page, and so the button can
 * show progress while a large workbook is built.
 */
export function ExportMasterButton({
  variant = "outline",
  label = "Export Master",
}: {
  variant?: "outline" | "default";
  label?: string;
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleExport() {
    setIsBusy(true);
    try {
      const response = await fetch("/api/exports/master");
      if (!response.ok) {
        toast.error(await response.text());
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "MSSA Master.xlsx";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Master exported.");
    } catch {
      toast.error("Could not download the export.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleExport}
      disabled={isBusy}
      className="gap-2"
    >
      {isBusy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <FileSpreadsheet className="size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
