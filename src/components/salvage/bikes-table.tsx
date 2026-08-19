"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Bike as BikeIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/salvage/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate, describeBike } from "@/lib/utils";
import { statusMeta } from "@/lib/status";
import type { BikeListItem } from "@/types/bike";

const PAGE_SIZE = 10;
const ALL = "__all__";

export function BikesTable({
  bikes,
  editable = false,
}: {
  bikes: BikeListItem[];
  editable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const statusOptions = useMemo(() => {
    const codes = new Set(bikes.map((b) => b.status));
    return Array.from(codes).map((code) => ({
      code,
      label: statusMeta(code).label,
    }));
  }, [bikes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bikes.filter((bike) => {
      if (status !== ALL && bike.status !== status) return false;
      if (!q) return true;
      return [
        bike.stockNumber,
        bike.claimNumber,
        bike.make,
        bike.model,
        bike.insuranceCompany,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [bikes, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (bikes.length === 0) {
    return (
      <EmptyState
        icon={BikeIcon}
        title="No bikes captured yet"
        description={
          editable
            ? "Add a salvage instruction manually, or bring your existing records across from Excel using Data Import."
            : "No salvage bikes have been captured yet."
        }
        action={
          editable ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/bikes/new">Add first bike</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/imports">Import from Excel</Link>
              </Button>
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Stock No., Claim No., Make, Model..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Stock No.</TableHead>
              <TableHead>Make / Model</TableHead>
              <TableHead>Claim No.</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No bikes match your search.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((bike) => (
              <TableRow key={bike.id} className="border-border">
                <TableCell>
                  <Link
                    href={`/bikes/${bike.stockNumber}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {bike.stockNumber}
                  </Link>
                </TableCell>
                <TableCell>{describeBike(bike)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {bike.claimNumber ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {bike.insuranceCompany ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(bike.dateReceived)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={bike.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : start + 1} to{" "}
          {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
          entries
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (n) =>
                  n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1
              )
              .reduce<number[]>((acc, n) => {
                if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === -1 ? (
                  <span
                    key={`gap-${i}`}
                    className="px-1.5 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={n}
                    variant={n === currentPage ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? "page" : undefined}
                  >
                    {n}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
