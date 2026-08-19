"use client";

import { Image as ImageIcon, MoreVertical, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import type { BikePhoto } from "@/types/bike";

export function PhotosGrid({ photos }: { photos: BikePhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border border-border"
        >
          <div
            className="flex aspect-square w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${photo.colorFrom}, ${photo.colorTo})`,
            }}
          >
            <ImageIcon
              className="size-8 text-muted-foreground/40"
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {photo.label}
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
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
