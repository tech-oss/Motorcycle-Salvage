import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportPanel } from "@/components/imports/import-panel";
import { RECENT_IMPORTS } from "@/lib/fixtures/dashboard";

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
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>File Name</TableHead>
                  <TableHead>Imported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_IMPORTS.map((row) => (
                  <TableRow key={row.fileName} className="border-border">
                    <TableCell className="font-medium">{row.fileName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.importedBy}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.records}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      >
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
