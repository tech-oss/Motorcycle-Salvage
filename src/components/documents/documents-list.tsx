"use client";

import { FileText, MoreVertical, Download, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { BikeDocument } from "@/types/bike";

export function DocumentsList({ documents }: { documents: BikeDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {doc.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(doc.uploadedAt)} · {doc.uploadedBy} · {doc.sizeLabel}
            </p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            {doc.type}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <MoreVertical className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="size-4" aria-hidden="true" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pencil className="size-4" aria-hidden="true" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
