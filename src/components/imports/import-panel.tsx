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
import { Progress } from "@/components/ui/progress";
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
  detectHeaderRow,
  guessTargetField,
  normalizeImportRow,
  type ImportTargetField,
  type MappedRow,
  type NormalizedRow,
} from "@/lib/validations/import";
import {
  beginImport,
  checkDuplicateStockNumbers,
  finalizeImport,
  importChunk,
} from "@/app/(app)/imports/actions";

type ParsedSheet = {
  /** Every row as raw strings, including the banner rows above the headers. */
  allRows: string[][];
  headerIndex: number;
};

type ParsedWorkbook = {
  fileName: string;
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
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
      warnings: string[];
      duplicates: Set<string>;
      decisions: Record<string, "skip" | "overwrite">;
    }
  | { step: "importing"; done: number; total: number }
  | {
      step: "result";
      imported: number;
      updated: number;
      skipped: number;
      invalid: number;
      duplicates: number;
      failures: string[];
    };

/** Rows per Server Action call — keeps each request under the body limit. */
const IMPORT_CHUNK_SIZE = 100;

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
        const raw = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
          raw: false,
        });
        const allRows = raw.map((r) => (r ?? []).map((c) => String(c ?? "")));
        sheets[name] = { allRows, headerIndex: detectHeaderRow(allRows) };
      }

      setWizard({
        step: "map",
        parsed: { fileName: file.name, sheetNames: workbook.SheetNames, sheets },
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
    const sheet = wizard.parsed.sheets[wizard.sheetName];
    return (
      <MappingStep
        key={`${wizard.sheetName}:${sheet.headerIndex}`}
        wizard={wizard}
        onCancel={reset}
        onChangeSheet={(sheetName) => setWizard({ ...wizard, sheetName })}
        onChangeHeaderRow={(headerIndex) =>
          setWizard({
            ...wizard,
            parsed: {
              ...wizard.parsed,
              sheets: {
                ...wizard.parsed.sheets,
                [wizard.sheetName]: { ...sheet, headerIndex },
              },
            },
          })
        }
        onContinue={async (mapping) => {
          setIsBusy(true);
          const headers = (sheet.allRows[sheet.headerIndex] ?? []).map((h) => h.trim());
          const dataRows = sheet.allRows.slice(sheet.headerIndex + 1);

          const validRows: NormalizedRow[] = [];
          const invalidErrors: string[] = [];
          const warnings: string[] = [];

          dataRows.forEach((rowCells, i) => {
            const mapped: MappedRow = {};
            // The whole original row travels with the record so the master is
            // imported without losing the columns Phase 1 does not model.
            const sourceRow: Record<string, string> = {};
            headers.forEach((header, colIndex) => {
              const field = mapping[colIndex];
              if (field) mapped[field] = rowCells[colIndex];
              if (header) sourceRow[header] = rowCells[colIndex] ?? "";
            });

            const result = normalizeImportRow(
              mapped,
              sheet.headerIndex + 2 + i,
              sourceRow
            );
            if (result.ok) {
              validRows.push(result.row);
              warnings.push(...result.warnings);
            } else {
              invalidErrors.push(...result.errors);
            }
          });

          // Duplicate stock numbers within the sheet itself: last row wins,
          // matching how re-running the same source would behave.
          const byStock = new Map<string, NormalizedRow>();
          for (const row of validRows) byStock.set(row.stock_number.toLowerCase(), row);
          const dedupedRows = [...byStock.values()];

          const dupResult = await checkDuplicateStockNumbers(
            dedupedRows.map((r) => r.stock_number)
          );
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
            warnings,
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
          const rows = wizard.validRows.map((row) => ({
            row,
            onDuplicate:
              wizard.decisions[row.stock_number.toLowerCase()] ?? ("skip" as const),
          }));

          setWizard({ step: "importing", done: 0, total: rows.length });

          const started = await beginImport(
            wizard.parsed.fileName,
            wizard.sheetName
          );
          if (started.error || !started.batchId) {
            toast.error(started.error ?? "Could not start the import.");
            setWizard({ ...wizard });
            return;
          }

          let imported = 0;
          let updated = 0;
          let skipped = 0;
          let duplicates = 0;
          const failures: string[] = [];

          for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
            const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE);
            const result = await importChunk(started.batchId, chunk);

            if (result.error) {
              toast.error(result.error);
              setWizard({ ...wizard });
              return;
            }

            imported += result.imported ?? 0;
            updated += result.updated ?? 0;
            skipped += result.skipped ?? 0;
            duplicates += result.duplicates ?? 0;
            if (result.failures?.length) failures.push(...result.failures);

            setWizard({
              step: "importing",
              done: Math.min(i + IMPORT_CHUNK_SIZE, rows.length),
              total: rows.length,
            });
          }

          await finalizeImport(started.batchId, {
            totalRows: wizard.validRows.length + wizard.invalidErrors.length,
            imported,
            updated,
            skipped,
            invalid: wizard.invalidErrors.length,
            duplicates,
          });

          toast.success("Import complete.");
          setWizard({
            step: "result",
            imported,
            updated,
            skipped,
            invalid: wizard.invalidErrors.length,
            duplicates,
            failures: failures.slice(0, 25),
          });
          router.refresh();
        }}
      />
    );
  }

  if (wizard.step === "importing") {
    const pct = wizard.total ? Math.round((wizard.done / wizard.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border px-8 py-16">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Importing {wizard.done.toLocaleString()} of{" "}
          {wizard.total.toLocaleString()} bikes…
        </p>
        <Progress value={pct} className="h-1.5 w-full max-w-sm" />
      </div>
    );
  }

  // step === "result"
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-border px-6 py-12 text-center">
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
      {wizard.failures.length > 0 && (
        <div className="w-full max-w-xl text-left">
          <p className="mb-1.5 text-sm font-medium text-destructive">
            Rows the database rejected:
          </p>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
            {wizard.failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={reset}>Import another file</Button>
    </div>
  );
}

function MappingStep({
  wizard,
  onCancel,
  onChangeSheet,
  onChangeHeaderRow,
  onContinue,
  isBusy,
}: {
  wizard: Extract<Wizard, { step: "map" }>;
  onCancel: () => void;
  onChangeSheet: (sheetName: string) => void;
  onChangeHeaderRow: (index: number) => void;
  onContinue: (mapping: HeaderMapping) => void;
  isBusy: boolean;
}) {
  const sheet = wizard.parsed.sheets[wizard.sheetName];
  const headers = (sheet.allRows[sheet.headerIndex] ?? []).map((h) => h.trim());
  const dataRowCount = Math.max(0, sheet.allRows.length - sheet.headerIndex - 1);

  const [mapping, setMapping] = useState<HeaderMapping>(() => {
    const initial: HeaderMapping = {};
    const claimed = new Set<ImportTargetField>();
    headers.forEach((h, i) => {
      const guess = guessTargetField(h);
      // The master repeats generic headers ("Amount", "Paid") across its
      // invoice blocks; only the first occurrence may claim a field.
      if (guess && !claimed.has(guess)) {
        initial[i] = guess;
        claimed.add(guess);
      }
    });
    return initial;
  });

  const usedFields = new Set(Object.values(mapping).filter(Boolean));
  const hasStockNumber = Object.values(mapping).includes("stock_number");
  const mappedCount = usedFields.size;

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Select worksheet
          </label>
          <Select value={wizard.sheetName} onValueChange={onChangeSheet}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a worksheet" />
            </SelectTrigger>
            <SelectContent>
              {wizard.parsed.sheetNames.map((name) => {
                const s = wizard.parsed.sheets[name];
                return (
                  <SelectItem key={name} value={name}>
                    {name} ({Math.max(0, s.allRows.length - s.headerIndex - 1)} rows)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Header row</label>
          <Select
            value={String(sheet.headerIndex)}
            onValueChange={(v) => onChangeHeaderRow(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheet.allRows.slice(0, 10).map((row, i) => {
                const preview = row
                  .filter((c) => c.trim())
                  .slice(0, 4)
                  .join(", ")
                  .slice(0, 48);
                return (
                  <SelectItem key={i} value={String(i)}>
                    Row {i + 1}
                    {preview ? ` — ${preview}` : " — (blank)"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Detected automatically — change it if your sheet has a title banner
            above the column names.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Map columns to fields</span>
          <span className="text-muted-foreground">
            {mappedCount} of {headers.filter(Boolean).length} mapped ·{" "}
            {dataRowCount} rows
          </span>
        </div>
        <div className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {headers.map((header, i) => (
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
        <p className="text-xs text-muted-foreground">
          Unmapped columns are still stored with each bike, so nothing in your
          master is lost.
        </p>
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
            {wizard.invalidErrors.length} skipped row
            {wizard.invalidErrors.length === 1 ? "" : "s"}
          </Badge>
        )}
        {wizard.warnings.length > 0 && (
          <Badge className="bg-amber-500/10 text-amber-400">
            {wizard.warnings.length} cell warning
            {wizard.warnings.length === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {wizard.invalidErrors.length > 0 && (
        <details className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-destructive">
            {wizard.invalidErrors.length} row
            {wizard.invalidErrors.length === 1 ? "" : "s"} will be skipped
          </summary>
          <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground">
            {wizard.invalidErrors.slice(0, 50).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
            {wizard.invalidErrors.length > 50 && (
              <li>…and {wizard.invalidErrors.length - 50} more.</li>
            )}
          </ul>
        </details>
      )}

      {wizard.warnings.length > 0 && (
        <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-amber-400">
            {wizard.warnings.length} cell
            {wizard.warnings.length === 1 ? "" : "s"} could not be read — the row
            still imports, that field is left blank
          </summary>
          <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground">
            {wizard.warnings.slice(0, 50).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
            {wizard.warnings.length > 50 && (
              <li>…and {wizard.warnings.length - 50} more.</li>
            )}
          </ul>
        </details>
      )}

      {duplicateRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              These stock numbers already exist. Nothing is overwritten unless
              you say so.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  duplicateRows.forEach((r) =>
                    onDecisionChange(r.stock_number.toLowerCase(), "skip")
                  )
                }
              >
                Skip all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  duplicateRows.forEach((r) =>
                    onDecisionChange(r.stock_number.toLowerCase(), "overwrite")
                  )
                }
              >
                Overwrite all
              </Button>
            </div>
          </div>
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
                {duplicateRows.slice(0, 200).map((row) => {
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
          {duplicateRows.length > 200 && (
            <p className="text-xs text-muted-foreground">
              Showing the first 200. Use Skip all / Overwrite all to decide the
              rest.
            </p>
          )}
        </div>
      )}

      {wizard.validRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No valid rows to import. Go back and check your header row and column
          mapping.
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
