import Link from "next/link";
import {
  Bell,
  Bike as BikeIcon,
  ClipboardList,
  FileClock,
  Plus,
  Truck,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { LocationBars } from "@/components/dashboard/location-bars";
import { RecentInstructionsTable } from "@/components/dashboard/recent-instructions-table";
import { EmptyState } from "@/components/layout/empty-state";
import {
  getDashboardStats,
  getBikesByInsurance,
  getUpliftmentStatusBreakdown,
  getBikesByLocation,
} from "@/services/dashboard";
import { getBikes } from "@/services/bikes";
import { getCurrentProfile } from "@/lib/supabase/auth";

const STAT_ICONS = [BikeIcon, FileClock, ClipboardList, Truck, Wrench];

export default async function DashboardPage() {
  const [profile, stats, recentBikes, byInsurance, byUpliftment, byLocation] =
    await Promise.all([
      getCurrentProfile(),
      getDashboardStats(),
      getBikes({ limit: 6 }),
      getBikesByInsurance(),
      getUpliftmentStatusBreakdown(),
      getBikesByLocation(),
    ]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "there";
  const hasBikes = (stats[0]?.value ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Welcome back, {firstName} 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your salvage operations today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/bikes/new">
              <Plus className="size-4" aria-hidden="true" />
              New Instruction
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            href={stat.href}
            icon={STAT_ICONS[i]}
          />
        ))}
      </div>

      {!hasBikes ? (
        <Card className="py-5">
          <CardContent className="px-5">
            <EmptyState
              icon={BikeIcon}
              title="No bikes yet"
              description="Once you capture a salvage instruction or import your existing Excel data, your fleet metrics and recent instructions will appear here."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" className="gap-2">
                    <Link href="/bikes/new">
                      <Plus className="size-4" aria-hidden="true" />
                      Add first bike
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link href="/imports">
                      <UploadCloud className="size-4" aria-hidden="true" />
                      Import from Excel
                    </Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="py-5">
            <CardHeader className="flex items-center justify-between px-5">
              <CardTitle className="text-base">Recent Instructions</CardTitle>
              <Button
                variant="link"
                size="sm"
                asChild
                className="h-auto p-0 text-primary"
              >
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
                <DonutChart segments={byInsurance} />
              </CardContent>
            </Card>

            <Card className="py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-base">Upliftment Status</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                {byUpliftment.length > 0 ? (
                  <DonutChart segments={byUpliftment} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No bikes are currently in an upliftment stage.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-base">Bikes by Location</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <LocationBars data={byLocation} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
