"use client";

import { Image as ImageIcon, MoreVertical, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/utils";
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
  editable = false,
}: {
  photos: BikePhoto[];
  editable?: boolean;
}) {
  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No photos yet"
        description="Upload front, rear, side, odometer, VIN, engine and damage photos for this bike."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border border-border"
        >
          {/* The photos bucket is private, so rendering a real thumbnail needs
              a signed URL generated server-side. Placeholder until upload and
              signing are wired up. */}
          <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <ImageIcon
              className="size-8 text-muted-foreground/40"
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {photo.caption?.trim() || CATEGORY_LABELS[photo.category]}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDate(photo.uploadedAt)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreVertical className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="size-4" aria-hidden="true" />
                  Download
                </DropdownMenuItem>
                {editable && (
                  <DropdownMenuItem variant="destructive">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
