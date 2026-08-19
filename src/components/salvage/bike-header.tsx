import Link from "next/link";
import { ChevronRight, Lock, Pencil, MoreVertical, QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/salvage/status-badge";
import type { Bike } from "@/types/bike";

export function BikeHeader({
  bike,
  editable,
}: {
  bike: Bike;
  editable: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/bikes" className="hover:text-foreground">
          Salvage Bikes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">{bike.stockNumber}</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
            <Lock className="size-4" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold text-foreground">
            {bike.stockNumber}
          </h2>
          <StatusBadge status={bike.status} />
          {bike.archived && (
            <Badge variant="outline" className="text-muted-foreground">
              Archived
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <Button variant="outline" className="gap-2">
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/bikes/${bike.stockNumber}/qr-code`}>
                  <QrCode className="size-4" aria-hidden="true" />
                  QR Code Sticker
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/bikes/${bike.stockNumber}/upliftment-instruction`}>
                  <Printer className="size-4" aria-hidden="true" />
                  Print Upliftment Instruction
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
