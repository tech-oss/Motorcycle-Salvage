import Link from "next/link";
import { Bell, Bike as BikeIcon, ClipboardList, FileClock, Plus, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { LocationBars } from "@/components/dashboard/location-bars";
import { RecentInstructionsTable } from "@/components/dashboard/recent-instructions-table";
import {
  getDashboardStats,
  getBikesByInsurance,
  getUpliftmentStatusBreakdown,
  getBikesByLocation,
} from "@/lib/fixtures/dashboard";
import { getBikes } from "@/lib/fixtures/bikes";

const STAT_ICONS = [BikeIcon, FileClock, ClipboardList, Truck, Wrench];

export default function DashboardPage() {
  const recentBikes = getBikes().slice(0, 6);
  const stats = getDashboardStats();
  const bikesByInsurance = getBikesByInsurance();
  const upliftmentStatus = getUpliftmentStatusBreakdown();
  const bikesByLocation = getBikesByLocation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Welcome back, Leonard 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your salvage operations today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/upliftments">
              <Plus className="size-4" aria-hidden="true" />
              New Instruction
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="relative shrink-0"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              3
            </span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            period={stat.period}
            icon={STAT_ICONS[i]}
          />
        ))}
      </div>

      <Card className="py-5">
        <CardHeader className="flex items-center justify-between px-5">
          <CardTitle className="text-base">Recent Instructions</CardTitle>
          <Button variant="link" size="sm" asChild className="h-auto p-0 text-primary">
            <Link href="/bikes">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5">
          <RecentInstructionsTable bikes={recentBikes} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Bikes by Insurance</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <DonutChart segments={bikesByInsurance} />
          </CardContent>
        </Card>

        <Card className="py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Upliftment Status</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <DonutChart segments={upliftmentStatus} />
          </CardContent>
        </Card>

        <Card className="py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Bikes by Location</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <LocationBars data={bikesByLocation} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
