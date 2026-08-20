"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  DOCUMENTS_BUCKET,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
} from "@/lib/storage";
import { registerDocument } from "@/app/(app)/bikes/file-actions";
import type { DocumentType } from "@/types/database";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "insurance_report", label: "Insurance Report" },
  { value: "release_invoice", label: "Release Invoice" },
  { value: "transport_invoice", label: "Transport Invoice" },
  { value: "pop", label: "Proof of Payment" },
  { value: "purchase_agreement", label: "Purchase Agreement" },
  { value: "upliftment_instruction", label: "Upliftment Instruction" },
  { value: "other", label: "Other" },
];

export function DocumentUploadDialog({
  bikeId,
  stockNumber,
}: {
  bikeId: string;
  stockNumber: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [isDragging, setIsDragging] = useState(false);

  const { upload, progress, isUploading, reset } = useFileUpload({
    bucket: DOCUMENTS_BUCKET,
    bikeId,
    kind: "document",
    maxBytes: DOCUMENT_MAX_BYTES,
    mimeTypes: DOCUMENT_MIME_TYPES,
    register: (file, storagePath) =>
      registerDocument({
        bikeId,
        stockNumber,
        name: file.name,
        documentType,
        storagePath,
        mimeType: file.type || null,
        fileSize: file.size,
      }),
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleUpload() {
    const { uploaded, failed } = await upload(files);

    if (uploaded > 0) {
      toast.success(
        `${uploaded} document${uploaded === 1 ? "" : "s"} uploaded.`
      );
      router.refresh();
    }
    if (failed > 0) {
      toast.error(`${failed} file${failed === 1 ? "" : "s"} could not be uploaded.`);
    }
    if (failed === 0) {
      setOpen(false);
      setFiles([]);
      reset();
    }
  }

  function handleOpenChange(next: boolean) {
    if (isUploading) return; // don't tear down mid-upload
    setOpen(next);
    if (!next) {
      setFiles([]);
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="size-4" aria-hidden="true" />
          Upload Files
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            PDFs, images and Office files up to 20MB each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentType">Document type</Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as DocumentType)}
            >
              <SelectTrigger id="documentType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors",
              isDragging && "border-primary bg-primary/5"
            )}
          >
            <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Drag files here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {files.map((file, i) => {
                const p = progress[i];
                return (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    {p?.status === "uploading" && (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    )}
                    {p?.status === "saving" && (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    )}
                    {p?.status === "done" && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    )}
                    {p?.status === "error" && (
                      <span
                        className="flex items-center gap-1 text-xs text-destructive"
                        title={p.error}
                      >
                        <CircleAlert className="size-4 shrink-0" />
                        Failed
                      </span>
                    )}
                    {!isUploading && !p && (
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, x) => x !== i))
                        }
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {progress.some((p) => p.status === "error") && (
            <p className="text-xs text-destructive">
              {progress.find((p) => p.status === "error")?.error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="gap-2"
          >
            {isUploading && <Loader2 className="size-4 animate-spin" />}
            {isUploading ? "Uploading…" : `Upload ${files.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
