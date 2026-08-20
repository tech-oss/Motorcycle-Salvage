"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportDropzone } from "./import-dropzone";
import {
  IMPORT_TARGET_FIELDS,
  normalizeImportRow,
  type ImportTargetField,
  type MappedRow,
  type NormalizedRow,
} from "@/lib/validations/import";
import { checkDuplicateStockNumbers, runImport } from "@/app/(app)/imports/actions";

type ParsedWorkbook = {
  fileName: string;
  sheetNames: string[];
  sheets: Record<string, { headers: string[]; rows: string[][] }>;
};

/** header index -> target field, or undefined for "do not import". */
type HeaderMapping = Record<number, ImportTargetField | undefined>;

type Wizard =
  | { step: "upload" }
  | { step: "map"; parsed: ParsedWorkbook; sheetName: string }
  | {
      step: "review";
      parsed: ParsedWorkbook;
      sheetName: string;
      validRows: NormalizedRow[];
      invalidErrors: string[];
      duplicates: Set<string>;
      decisions: Record<string, "skip" | "overwrite">;
    }
  | { step: "importing" }
  | {
      step: "result";
      imported: number;
      updated: number;
      skipped: number;
      invalid: number;
      duplicates: number;
    };

function guessField(header: string): ImportTargetField | undefined {
  const h = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const field of IMPORT_TARGET_FIELDS) {
    const label = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const value = field.value.replace(/_/g, "");
    if (h === label || h === value || h.includes(value) || value.includes(h)) {
      return field.value;
    }
  }
  return undefined;
}

export function ImportPanel() {
  const router = useRouter();
  const [wizard, setWizard] = useState<Wizard>({ step: "upload" });
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheets: ParsedWorkbook["sheets"] = {};
      for (const name of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
          raw: false,
        });
        const headers = (rows[0] ?? []).map((h) => String(h ?? "").trim());
        const dataRows = rows
          .slice(1)
          .map((r) => headers.map((_, i) => String(r[i] ?? "")));
        sheets[name] = { headers, rows: dataRows };
      }

      const parsed: ParsedWorkbook = {
        fileName: file.name,
        sheetNames: workbook.SheetNames,
        sheets,
      };
      setWizard({
        step: "map",
        parsed,
        sheetName: workbook.SheetNames[0] ?? "",
      });
    } catch {
      setError(
        "Could not read that file. Make sure it is a valid .xlsx or .xls workbook."
      );
    } finally {
      setIsParsing(false);
    }
  }

  function reset() {
    setWizard({ step: "upload" });
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

  if (wizard.step === "upload") {
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

  if (wizard.step === "map") {
    return (
      <MappingStep
        wizard={wizard}
        onCancel={reset}
        onChangeSheet={(sheetName) => setWizard({ ...wizard, sheetName })}
        onContinue={async (mapping) => {
          setIsBusy(true);
          const sheet = wizard.parsed.sheets[wizard.sheetName];
          const validRows: NormalizedRow[] = [];
          const invalidErrors: string[] = [];

          sheet.rows.forEach((rowCells, i) => {
            const mapped: MappedRow = {};
            sheet.headers.forEach((_, colIndex) => {
              const field = mapping[colIndex];
              if (field) mapped[field] = rowCells[colIndex];
            });
            const result = normalizeImportRow(mapped, i + 2);
            if (result.ok) {
              validRows.push(result.row);
            } else {
              invalidErrors.push(...result.errors);
            }
          });

          // Guard against duplicate stock numbers within the sheet itself —
          // the last row for a given stock number wins, matching how a
          // second pass over the same source would behave.
          const byStock = new Map<string, NormalizedRow>();
          for (const row of validRows) byStock.set(row.stock_number.toLowerCase(), row);
          const dedupedRows = [...byStock.values()];

          const stockNumbers = dedupedRows.map((r) => r.stock_number);
          const dupResult = await checkDuplicateStockNumbers(stockNumbers);
          setIsBusy(false);

          if (dupResult.error) {
            toast.error(dupResult.error);
            return;
          }

          const duplicates = new Set(
            (dupResult.duplicates ?? []).map((s) => s.toLowerCase())
          );
          const decisions: Record<string, "skip" | "overwrite"> = {};
          for (const s of duplicates) decisions[s] = "skip";

          setWizard({
            step: "review",
            parsed: wizard.parsed,
            sheetName: wizard.sheetName,
            validRows: dedupedRows,
            invalidErrors,
            duplicates,
            decisions,
          });
        }}
        isBusy={isBusy}
      />
    );
  }

  if (wizard.step === "review") {
    return (
      <ReviewStep
        wizard={wizard}
        onBack={() =>
          setWizard({
            step: "map",
            parsed: wizard.parsed,
            sheetName: wizard.sheetName,
          })
        }
        onDecisionChange={(stock, decision) =>
          setWizard({
            ...wizard,
            decisions: { ...wizard.decisions, [stock]: decision },
          })
        }
        onConfirm={async () => {
          setWizard({ step: "importing" });
          const result = await runImport({
            fileName: wizard.parsed.fileName,
            sheetName: wizard.sheetName,
            totalRows: wizard.validRows.length + wizard.invalidErrors.length,
            invalidCount: wizard.invalidErrors.length,
            rows: wizard.validRows.map((row) => ({
              row,
              onDuplicate:
                wizard.decisions[row.stock_number.toLowerCase()] ?? "skip",
            })),
          });

          if (result.error) {
            toast.error(result.error);
            setWizard({
              step: "review",
              parsed: wizard.parsed,
              sheetName: wizard.sheetName,
              validRows: wizard.validRows,
              invalidErrors: wizard.invalidErrors,
              duplicates: wizard.duplicates,
              decisions: wizard.decisions,
            });
            return;
          }

          toast.success("Import complete.");
          setWizard({
            step: "result",
            imported: result.imported ?? 0,
            updated: result.updated ?? 0,
            skipped: result.skipped ?? 0,
            invalid: result.invalid ?? 0,
            duplicates: result.duplicates ?? 0,
          });
          router.refresh();
        }}
      />
    );
  }

  if (wizard.step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border py-16">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Importing your bikes…</p>
      </div>
    );
  }

  // step === "result"
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-border py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="size-6" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Import complete</h3>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what happened with your file.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Badge className="bg-emerald-500/10 text-emerald-400">
          {wizard.imported} imported
        </Badge>
        <Badge variant="outline">{wizard.updated} updated</Badge>
        <Badge variant="outline">{wizard.skipped} skipped</Badge>
        <Badge variant="outline">{wizard.duplicates} duplicates</Badge>
        {wizard.invalid > 0 && (
          <Badge className="bg-destructive/10 text-destructive">
            {wizard.invalid} invalid
          </Badge>
        )}
      </div>
      <Button onClick={reset}>Import another file</Button>
    </div>
  );
}

function MappingStep({
  wizard,
  onCancel,
  onChangeSheet,
  onContinue,
  isBusy,
}: {
  wizard: Extract<Wizard, { step: "map" }>;
  onCancel: () => void;
  onChangeSheet: (sheetName: string) => void;
  onContinue: (mapping: HeaderMapping) => void;
  isBusy: boolean;
}) {
  const sheet = wizard.parsed.sheets[wizard.sheetName];
  const [mapping, setMapping] = useState<HeaderMapping>(() => {
    const initial: HeaderMapping = {};
    sheet.headers.forEach((h, i) => {
      initial[i] = guessField(h);
    });
    return initial;
  });

  const usedFields = new Set(Object.values(mapping).filter(Boolean));
  const hasStockNumber = Object.values(mapping).includes("stock_number");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <FileSpreadsheet className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {wizard.parsed.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {wizard.parsed.sheetNames.length} worksheet
            {wizard.parsed.sheetNames.length === 1 ? "" : "s"} detected
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Remove file">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          Select worksheet
        </label>
        <Select value={wizard.sheetName} onValueChange={onChangeSheet}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Choose a worksheet" />
          </SelectTrigger>
          <SelectContent>
            {wizard.parsed.sheetNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name} ({wizard.parsed.sheets[name].rows.length} rows)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Map columns to fields</span>
          <span className="text-muted-foreground">
            {sheet.headers.length} columns · {sheet.rows.length} rows
          </span>
        </div>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {sheet.headers.map((header, i) => (
            <div
              key={`${header}-${i}`}
              className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <Badge variant="outline" className="w-fit shrink-0">
                {header || `Column ${i + 1}`}
              </Badge>
              <Select
                value={mapping[i] ?? "__skip__"}
                onValueChange={(value) =>
                  setMapping((prev) => ({
                    ...prev,
                    [i]: value === "__skip__" ? undefined : (value as ImportTargetField),
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">Don&apos;t import</SelectItem>
                  {IMPORT_TARGET_FIELDS.map((field) => (
                    <SelectItem
                      key={field.value}
                      value={field.value}
                      disabled={usedFields.has(field.value) && mapping[i] !== field.value}
                    >
                      {field.label}
                      {field.required ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        {!hasStockNumber && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            Map a column to Stock Number to continue — it identifies each bike.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          onClick={() => onContinue(mapping)}
          disabled={!hasStockNumber || isBusy}
          className="gap-2"
        >
          {isBusy && <Loader2 className="size-4 animate-spin" />}
          Preview import
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  wizard,
  onBack,
  onDecisionChange,
  onConfirm,
}: {
  wizard: Extract<Wizard, { step: "review" }>;
  onBack: () => void;
  onDecisionChange: (stockLower: string, decision: "skip" | "overwrite") => void;
  onConfirm: () => void;
}) {
  const duplicateRows = useMemo(
    () =>
      wizard.validRows.filter((r) =>
        wizard.duplicates.has(r.stock_number.toLowerCase())
      ),
    [wizard.validRows, wizard.duplicates]
  );
  const newRows = wizard.validRows.length - duplicateRows.length;
  const overwriteCount = duplicateRows.filter(
    (r) => wizard.decisions[r.stock_number.toLowerCase()] === "overwrite"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        <Badge className="bg-emerald-500/10 text-emerald-400">
          {newRows} new bike{newRows === 1 ? "" : "s"}
        </Badge>
        {duplicateRows.length > 0 && (
          <Badge variant="outline">
            {duplicateRows.length} duplicate stock number
            {duplicateRows.length === 1 ? "" : "s"}
          </Badge>
        )}
        {wizard.invalidErrors.length > 0 && (
          <Badge className="bg-destructive/10 text-destructive">
            {wizard.invalidErrors.length} invalid row
            {wizard.invalidErrors.length === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {wizard.invalidErrors.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            These rows will be skipped:
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {wizard.invalidErrors.slice(0, 10).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
            {wizard.invalidErrors.length > 10 && (
              <li>…and {wizard.invalidErrors.length - 10} more.</li>
            )}
          </ul>
        </div>
      )}

      {duplicateRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            These stock numbers already exist. Choose what to do with each —
            nothing is overwritten unless you say so.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock Number</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead className="w-44">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicateRows.map((row) => {
                  const key = row.stock_number.toLowerCase();
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        {row.stock_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[row.make, row.model].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={wizard.decisions[key] ?? "skip"}
                          onValueChange={(v) =>
                            onDecisionChange(key, v as "skip" | "overwrite")
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Skip (keep existing)</SelectItem>
                            <SelectItem value="overwrite">Overwrite</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {wizard.validRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No valid rows to import. Go back and check your column mapping.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ready to import {newRows} new bike{newRows === 1 ? "" : "s"}
          {overwriteCount > 0
            ? ` and overwrite ${overwriteCount} existing bike${overwriteCount === 1 ? "" : "s"}`
            : ""}
          .
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={wizard.validRows.length === 0}>
          Confirm &amp; Import
        </Button>
      </div>
    </div>
  );
}
