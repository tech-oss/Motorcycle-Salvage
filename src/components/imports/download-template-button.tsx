"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { IMPORT_TARGET_FIELDS } from "@/lib/validations/import";

export function DownloadTemplateButton() {
  function handleDownload() {
    const headers = IMPORT_TARGET_FIELDS.map((f) => f.label);
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bikes");
    XLSX.writeFile(workbook, "salvage-bikes-import-template.xlsx");
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handleDownload}>
      <Download className="size-4" aria-hidden="true" />
      Download Template
    </Button>
  );
}
