import { notFound } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BikeHeader } from "@/components/salvage/bike-header";
import { BikePhotoPanel } from "@/components/salvage/bike-photo-panel";
import { BikeOverview } from "@/components/salvage/bike-overview";
import { NotesTimeline } from "@/components/salvage/notes-timeline";
import { DocumentsList } from "@/components/documents/documents-list";
import { PhotosGrid } from "@/components/photos/photos-grid";
import { BikeUpliftmentPanel } from "@/components/upliftments/bike-upliftment-panel";
import { getBikeByStockNumber } from "@/services/bikes";
import { canWrite } from "@/lib/supabase/auth";
import { getCurrentProfile } from "@/lib/supabase/auth";

export default async function BikeDetailPage({
  params,
}: PageProps<"/bikes/[stockNumber]">) {
  const { stockNumber } = await params;
  const [bike, profile] = await Promise.all([
    getBikeByStockNumber(stockNumber),
    getCurrentProfile(),
  ]);

  if (!bike) notFound();

  const editable = canWrite(profile);

  return (
    <div className="flex flex-col gap-6">
      <BikeHeader bike={bike} editable={editable} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <BikePhotoPanel bike={bike} />

        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({bike.documents.length})
            </TabsTrigger>
            <TabsTrigger value="photos">
              Photos ({bike.photos.length})
            </TabsTrigger>
            <TabsTrigger value="upliftment">Upliftment</TabsTrigger>
            <TabsTrigger value="notes">
              Notes ({bike.communications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <BikeOverview bike={bike} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card className="gap-4 py-5">
              <CardContent className="flex flex-col gap-4 px-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {bike.documents.length} document
                    {bike.documents.length === 1 ? "" : "s"}
                  </p>
                  {editable && (
                    <Button size="sm" className="gap-2">
                      <Upload className="size-4" aria-hidden="true" />
                      Upload Files
                    </Button>
                  )}
                </div>
                <DocumentsList documents={bike.documents} editable={editable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="mt-4">
            <Card className="gap-4 py-5">
              <CardContent className="flex flex-col gap-4 px-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Photos ({bike.photos.length})
                  </p>
                  {editable && (
                    <Button size="sm" className="gap-2">
                      <Upload className="size-4" aria-hidden="true" />
                      Upload Files
                    </Button>
                  )}
                </div>
                <PhotosGrid photos={bike.photos} editable={editable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upliftment" className="mt-4">
            <BikeUpliftmentPanel bike={bike} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <Card className="gap-4 py-5">
              <CardContent className="px-5">
                <NotesTimeline notes={bike.communications} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
