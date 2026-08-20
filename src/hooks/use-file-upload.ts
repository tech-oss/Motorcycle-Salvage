"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildStoragePath, validateFile } from "@/lib/storage";
import { discardOrphanedUpload } from "@/app/(app)/bikes/file-actions";

export type UploadProgress = {
  fileName: string;
  status: "pending" | "uploading" | "saving" | "done" | "error";
  error?: string;
};

/**
 * Uploads files straight from the browser to Supabase Storage, then records
 * each one via a Server Action.
 *
 * Direct-to-storage rather than posting through the Next.js server: a
 * serverless request body is capped well below a phone photo, and routing
 * bytes through the server would double the transfer for no gain. Storage
 * RLS still applies — the browser client carries the user's session.
 */
export function useFileUpload({
  bucket,
  bikeId,
  kind,
  maxBytes,
  mimeTypes,
  register,
}: {
  bucket: string;
  bikeId: string;
  kind: "document" | "photo";
  maxBytes: number;
  mimeTypes: string[];
  /** Records the uploaded object in the database. */
  register: (file: File, storagePath: string) => Promise<{ error?: string }>;
}) {
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  function update(index: number, patch: Partial<UploadProgress>) {
    setProgress((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  }

  async function upload(files: File[]): Promise<{ uploaded: number; failed: number }> {
    if (files.length === 0) return { uploaded: 0, failed: 0 };

    setIsUploading(true);
    setProgress(
      files.map((f) => ({ fileName: f.name, status: "pending" as const }))
    );

    const supabase = createClient();
    let uploaded = 0;
    let failed = 0;

    for (const [index, file] of files.entries()) {
      const invalid = validateFile(file, { maxBytes, mimeTypes });
      if (invalid) {
        update(index, { status: "error", error: invalid });
        failed++;
        continue;
      }

      update(index, { status: "uploading" });
      const storagePath = buildStoragePath(bikeId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        update(index, { status: "error", error: uploadError.message });
        failed++;
        continue;
      }

      update(index, { status: "saving" });
      const result = await register(file, storagePath);

      if (result.error) {
        // The bytes landed but the row didn't. Remove the object so it
        // doesn't linger invisibly in the bucket.
        await discardOrphanedUpload(kind, storagePath);
        update(index, { status: "error", error: result.error });
        failed++;
        continue;
      }

      update(index, { status: "done" });
      uploaded++;
    }

    setIsUploading(false);
    return { uploaded, failed };
  }

  function reset() {
    setProgress([]);
  }

  return { upload, progress, isUploading, reset };
}
