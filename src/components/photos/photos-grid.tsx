"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  MoreVertical,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/utils";
import { deletePhoto, getDownloadUrl } from "@/app/(app)/bikes/file-actions";
import type { BikePhoto, PhotoCategory } from "@/types/bike";

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  front: "Front View",
  rear: "Rear View",
  left: "Left Side",
  right: "Right Side",
  odometer: "Odometer",
  vin: "VIN Plate",
  engine: "Engine",
  damage: "Damage",
  other: "Other",
};

export function PhotosGrid({
  photos,
  signedUrls,
  stockNumber,
  editable = false,
}: {
  photos: BikePhoto[];
  /** storage_path → signed URL, minted server-side (private bucket). */
  signedUrls: Record<string, string>;
  stockNumber: string;
  editable?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<BikePhoto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BikePhoto | null>(null);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No photos yet"
        description="Upload front, rear, side, odometer, VIN, engine and damage photos for this bike."
      />
    );
  }

  function handleDownload(photo: BikePhoto) {
    startTransition(async () => {
      const label = CATEGORY_LABELS[photo.category];
      const ext = photo.storagePath.split(".").pop() ?? "jpg";
      const result = await getDownloadUrl(
        "photo",
        photo.storagePath,
        `${stockNumber}-${label.replace(/\s+/g, "-")}.${ext}`
      );
      if (result.error || !result.url) {
        toast.error(result.error ?? "Could not prepare that download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete(photo: BikePhoto) {
    startTransition(async () => {
      const result = await deletePhoto(photo.id, stockNumber);
      setPendingDelete(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo deleted.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => {
          const url = signedUrls[photo.storagePath];
          const label = photo.caption?.trim() || CATEGORY_LABELS[photo.category];

          return (
            <div
              key={photo.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-border"
            >
              <button
                type="button"
                onClick={() => url && setLightbox(photo)}
                disabled={!url}
                className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-secondary to-muted transition-opacity hover:opacity-90 disabled:cursor-default"
                aria-label={`View ${label} full size`}
              >
                {url ? (
                  /* Signed URLs expire, so Next's image optimizer would cache
                     a link that later 403s. A plain img avoids that. */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={url}
                    alt={label}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon
                    className="size-8 text-muted-foreground/40"
                    aria-hidden="true"
                  />
                )}
              </button>

              <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(photo.uploadedAt)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Actions for ${label}`}
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleDownload(photo)}>
                      <Download className="size-4" aria-hidden="true" />
                      Download
                    </DropdownMenuItem>
                    {editable && (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete(photo)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">
            {lightbox
              ? lightbox.caption?.trim() || CATEGORY_LABELS[lightbox.category]
              : "Photo"}
          </DialogTitle>
          {lightbox && signedUrls[lightbox.storagePath] && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={signedUrls[lightbox.storagePath]}
              alt={lightbox.caption?.trim() || CATEGORY_LABELS[lightbox.category]}
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
          )}
          <p className="text-center text-sm text-muted-foreground">
            {lightbox &&
              `${lightbox.caption?.trim() || CATEGORY_LABELS[lightbox.category]} · ${formatDate(lightbox.uploadedAt)}`}
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) handleDelete(pendingDelete);
              }}
              disabled={isPending}
              className="gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
