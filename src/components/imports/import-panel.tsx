"use client";

import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, TriangleAlert, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImportDropzone } from "./import-dropzone";

type ParsedWorkbook = {
  fileName: string;
  sheetNames: string[];
  sheets: Record<string, { headers: string[]; rowCount: number }>;
};

const STEPS = [
  "File uploaded successfully",
  "Reading data from file",
  "Validating records",
  "Detecting duplicates",
];

export function ImportPanel() {
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsParsing(true);
    setParsed(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheets: ParsedWorkbook["sheets"] = {};
      for (const name of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
        });
        const headers = (rows[0] ?? []).map((h) => String(h ?? "").trim());
        sheets[name] = { headers, rowCount: Math.max(0, rows.length - 1) };
      }

      setParsed({ fileName: file.name, sheetNames: workbook.SheetNames, sheets });
      setActiveSheet(workbook.SheetNames[0] ?? "");
    } catch {
      setError(
        "Could not read that file. Make sure it is a valid .xlsx or .xls workbook."
      );
    } finally {
      setIsParsing(false);
    }
  }

  function reset() {
    setParsed(null);
    setActiveSheet("");
    setError(null);
  }

  if (isParsing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border py-16">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Reading your workbook…</p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="flex flex-col gap-3">
        <ImportDropzone onFileSelected={handleFile} />
        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }

  const sheet = parsed.sheets[activeSheet];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <FileSpreadsheet className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {parsed.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {parsed.sheetNames.length} worksheet
            {parsed.sheetNames.length === 1 ? "" : "s"} detected
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove file">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          Select worksheet
        </label>
        <Select value={activeSheet} onValueChange={setActiveSheet}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose a worksheet" />
          </SelectTrigger>
          <SelectContent>
            {parsed.sheetNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name} ({parsed.sheets[name].rowCount} rows)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sheet && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Detected columns</span>
              <span className="text-muted-foreground">
                {sheet.headers.length} columns · {sheet.rowCount} rows
              </span>
            </div>
            <Progress value={100} className="h-1.5" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sheet.headers.map((header, i) => (
              <Badge key={`${header}-${i}`} variant="outline">
                {header || `(column ${i + 1})`}
              </Badge>
            ))}
          </div>

          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2 text-muted-foreground">
                {i < 2 ? (
                  <CheckCircle2
                    className="size-4 text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="size-4 rounded-full border border-border"
                    aria-hidden="true"
                  />
                )}
                {step}
              </li>
            ))}
          </ul>

          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Column mapping, validation and the final import run are wired up once
            the Supabase database is connected. Nothing has been written yet.
          </p>
        </div>
      )}
    </div>
  );
}
