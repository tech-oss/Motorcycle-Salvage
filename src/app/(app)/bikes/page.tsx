import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BikesTable } from "@/components/salvage/bikes-table";
import { getBikes } from "@/lib/fixtures/bikes";

export default function BikesPage() {
  const bikes = getBikes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Salvage Bikes</h2>
          <p className="text-sm text-muted-foreground">
            Manage and view all salvage bikes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>
          <Button asChild className="gap-2">
            <Link href="/upliftments">
              <Plus className="size-4" aria-hidden="true" />
              New Instruction
            </Link>
          </Button>
        </div>
      </div>

      <Card className="py-5">
        <CardContent className="px-5">
          <BikesTable bikes={bikes} />
        </CardContent>
      </Card>
    </div>
  );
}
