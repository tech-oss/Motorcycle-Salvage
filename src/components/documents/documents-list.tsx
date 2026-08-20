"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  MoreVertical,
  Download,
  Pencil,
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
  DialogFooter,
  DialogHeader,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  deleteDocument,
  renameDocument,
  getDownloadUrl,
} from "@/app/(app)/bikes/file-actions";
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
  stockNumber,
  editable = false,
}: {
  documents: BikeDocument[];
  stockNumber: string;
  editable?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<BikeDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BikeDocument | null>(null);

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload insurance reports, invoices, proof of payment or agreements for this bike."
      />
    );
  }

  function handleDownload(doc: BikeDocument) {
    startTransition(async () => {
      const result = await getDownloadUrl("document", doc.storagePath, doc.name);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Could not prepare that download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleRename() {
    if (!renaming) return;
    startTransition(async () => {
      const result = await renameDocument(renaming.id, renameValue, stockNumber);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Document renamed.");
      setRenaming(null);
      router.refresh();
    });
  }

  function handleDelete(doc: BikeDocument) {
    startTransition(async () => {
      const result = await deleteDocument(doc.id, stockNumber);
      setPendingDelete(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Document deleted.");
      router.refresh();
    });
  }

  return (
    <>
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
              <DropdownMenuTrigger
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Actions for ${doc.name}`}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleDownload(doc)}>
                  <Download className="size-4" aria-hidden="true" />
                  Download
                </DropdownMenuItem>
                {editable && (
                  <>
                    <DropdownMenuItem
                      onSelect={() => {
                        setRenaming(doc);
                        setRenameValue(doc.name);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setPendingDelete(doc)}
                    >
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

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentName">Name</Label>
            <Input
              id="documentName"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenaming(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isPending || !renameValue.trim()}
              className="gap-2"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} will be permanently removed. This cannot be
              undone.
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
