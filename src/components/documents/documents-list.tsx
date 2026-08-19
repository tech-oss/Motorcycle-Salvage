"use client";

import { FileText, MoreVertical, Download, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { BikeDocument, DocumentType } from "@/types/bike";

const TYPE_LABELS: Record<DocumentType, string> = {
  insurance_report: "Insurance Report",
  release_invoice: "Release Invoice",
  transport_invoice: "Transport Invoice",
  pop: "POP",
  purchase_agreement: "Purchase Agreement",
  upliftment_instruction: "Upliftment Instruction",
  other: "Other",
};

export function DocumentsList({
  documents,
  editable = false,
}: {
  documents: BikeDocument[];
  editable?: boolean;
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload insurance reports, invoices, proof of payment or agreements for this bike."
      />
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
              {formatDate(doc.uploadedAt)}
              {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
            </p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            {TYPE_LABELS[doc.type]}
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
              {editable && (
                <>
                  <DropdownMenuItem>
                    <Pencil className="size-4" aria-hidden="true" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
