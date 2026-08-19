"use client";

import { useRef, useState } from "react";
import { UploadCloud, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImportDropzone({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors",
        isDragging && "border-primary bg-primary/5"
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
        <UploadCloud className="size-6" aria-hidden="true" />
      </span>
      <p className="text-sm text-muted-foreground">
        Drag and drop your Excel file here
      </p>
      <p className="text-xs text-muted-foreground">or</p>
      <Button onClick={() => inputRef.current?.click()} className="gap-2">
        <FolderOpen className="size-4" aria-hidden="true" />
        Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Supported format: .xlsx, .xls
        <br />
        Maximum file size: 20MB
      </p>
    </div>
  );
}
