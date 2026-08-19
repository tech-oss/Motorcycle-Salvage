import { Download, CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportPanel } from "@/components/imports/import-panel";
import { EmptyState } from "@/components/layout/empty-state";

const GUIDELINES = [
  "Use our template for best results",
  "Required columns must be filled",
  "First row should contain headers",
  "Duplicate stock numbers will be skipped",
];

export default function ImportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Data Import</h2>
          <p className="text-sm text-muted-foreground">
            Import your existing bikes data from Excel.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="size-4" aria-hidden="true" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="py-5">
          <CardContent className="px-5">
            <ImportPanel />
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Import Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <ul className="flex flex-col gap-3 text-sm">
              {GUIDELINES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {/* Import runs will be recorded in import_batches / import_rows once
              the import pipeline writes to the database (ARCHITECTURE.md §4).
              Showing an empty state beats inventing a history that never
              happened. */}
          <EmptyState
            icon={History}
            title="No imports yet"
            description="Once you run an import, each batch will be listed here with its outcome — imported, updated, skipped, invalid and duplicate counts."
          />
        </CardContent>
      </Card>
    </div>
  );
}
