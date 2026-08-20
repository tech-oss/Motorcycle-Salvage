import { CheckCircle2, History, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportPanel } from "@/components/imports/import-panel";
import { DownloadTemplateButton } from "@/components/imports/download-template-button";
import { EmptyState } from "@/components/layout/empty-state";
import { getCurrentProfile, isAdmin } from "@/lib/supabase/auth";
import { getRecentImportBatches } from "@/services/imports";
import { formatDateTime } from "@/lib/utils";

const GUIDELINES = [
  "Use our template for best results",
  "Required columns must be filled",
  "First row should contain headers",
  "Duplicate stock numbers will be skipped",
];

export default async function ImportsPage() {
  const profile = await getCurrentProfile();

  // PROJECT_SCOPE §7 scopes Data Import to Admin specifically — staff manage
  // operational data, but migrating the historical fleet is an admin action.
  if (!isAdmin(profile)) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Data Import</h2>
          <p className="text-sm text-muted-foreground">
            Import your existing bikes data from Excel.
          </p>
        </div>
        <Card className="py-5">
          <CardContent className="px-5">
            <EmptyState
              icon={ShieldAlert}
              title="Administrator access required"
              description="Data import is limited to administrators. Contact an admin if you need historical bikes migrated from Excel."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentImports = await getRecentImportBatches();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Data Import</h2>
          <p className="text-sm text-muted-foreground">
            Import your existing bikes data from Excel.
          </p>
        </div>
        <DownloadTemplateButton />
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
          {recentImports.length === 0 ? (
            <EmptyState
              icon={History}
              title="No imports yet"
              description="Once you run an import, each batch will be listed here with its outcome — imported, updated, skipped, invalid and duplicate counts."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentImports.map((batch) => (
                <li
                  key={batch.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {batch.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(batch.created_at)} · {batch.sheet_name} ·{" "}
                      {batch.total_rows} row{batch.total_rows === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="bg-emerald-500/10 text-emerald-400">
                      {batch.imported_count} imported
                    </Badge>
                    {batch.updated_count > 0 && (
                      <Badge variant="outline">{batch.updated_count} updated</Badge>
                    )}
                    {batch.skipped_count > 0 && (
                      <Badge variant="outline">{batch.skipped_count} skipped</Badge>
                    )}
                    {batch.invalid_count > 0 && (
                      <Badge className="bg-destructive/10 text-destructive">
                        {batch.invalid_count} invalid
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
