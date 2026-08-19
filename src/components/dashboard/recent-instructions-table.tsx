import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/salvage/status-badge";
import type { Bike } from "@/types/bike";
import { formatDate } from "@/lib/utils";

export function RecentInstructionsTable({ bikes }: { bikes: Bike[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>Stock No.</TableHead>
            <TableHead>Claim No.</TableHead>
            <TableHead>Make / Model</TableHead>
            <TableHead>Insurance</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bikes.map((bike) => (
            <TableRow key={bike.stockNumber} className="border-border">
              <TableCell>
                <Link
                  href={`/bikes/${bike.stockNumber}`}
                  className="font-medium text-primary hover:underline"
                >
                  {bike.stockNumber}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bike.claimNumber}
              </TableCell>
              <TableCell>
                {bike.make} {bike.model} {bike.year}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bike.insuranceCompany}
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
  );
}
