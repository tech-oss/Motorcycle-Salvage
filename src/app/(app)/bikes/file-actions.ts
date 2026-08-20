"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canWrite, isAdmin } from "@/lib/supabase/auth";
import { createDownloadUrl } from "@/services/storage";
import { DOCUMENTS_BUCKET, PHOTOS_BUCKET } from "@/lib/storage";
import type { DocumentType, PhotoCategory } from "@/types/database";

export type FileActionState = { error?: string; ok?: boolean; url?: string };

const DOCUMENT_TYPES: DocumentType[] = [
  "insurance_report",
  "release_invoice",
  "transport_invoice",
  "pop",
  "purchase_agreement",
  "upliftment_instruction",
  "other",
];

const PHOTO_CATEGORIES: PhotoCategory[] = [
  "front",
  "rear",
  "left",
  "right",
  "odometer",
  "vin",
  "engine",
  "damage",
  "other",
];

const registerDocumentSchema = z.object({
  bikeId: z.string().uuid(),
  stockNumber: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  documentType: z.enum(DOCUMENT_TYPES as [DocumentType, ...DocumentType[]]),
  storagePath: z.string().min(1),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nonnegative(),
});

const registerPhotoSchema = z.object({
  bikeId: z.string().uuid(),
  stockNumber: z.string().min(1),
  category: z.enum(PHOTO_CATEGORIES as [PhotoCategory, ...PhotoCategory[]]),
  caption: z.string().trim().max(200).nullable(),
  storagePath: z.string().min(1),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nonnegative(),
});

/**
 * The file is already in Storage by the time this runs — the browser uploads
 * directly, because a serverless request body cap would reject large photos.
 * This records the row that makes the object discoverable.
 *
 * If this fails the caller deletes the orphaned object, so a failed upload
 * doesn't leave bytes nobody can see or bill for.
 */
export async function registerDocument(
  input: z.input<typeof registerDocumentSchema>
): Promise<FileActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to upload documents." };
  }

  const parsed = registerDocumentSchema.safeParse(input);
  if (!parsed.success) return { error: "That upload could not be recorded." };

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    bike_id: parsed.data.bikeId,
    name: parsed.data.name,
    document_type: parsed.data.documentType,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    file_size: parsed.data.fileSize,
  });

  if (error) return { error: `Could not save the document: ${error.message}` };

  revalidatePath(`/bikes/${parsed.data.stockNumber}`);
  return { ok: true };
}

export async function registerPhoto(
  input: z.input<typeof registerPhotoSchema>
): Promise<FileActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to upload photos." };
  }

  const parsed = registerPhotoSchema.safeParse(input);
  if (!parsed.success) return { error: "That upload could not be recorded." };

  const supabase = await createClient();
  const { error } = await supabase.from("bike_photos").insert({
    bike_id: parsed.data.bikeId,
    category: parsed.data.category,
    caption: parsed.data.caption,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    file_size: parsed.data.fileSize,
  });

  if (error) return { error: `Could not save the photo: ${error.message}` };

  revalidatePath(`/bikes/${parsed.data.stockNumber}`);
  return { ok: true };
}

export async function renameDocument(
  id: string,
  name: string,
  stockNumber: string
): Promise<FileActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to rename documents." };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ name: trimmed.slice(0, 200) })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Could not rename: ${error.message}` };
  if (!data) return { error: "That document could not be renamed." };

  revalidatePath(`/bikes/${stockNumber}`);
  return { ok: true };
}

/**
 * Deletes the row, then the object. Row first: if the object delete fails we
 * are left with an unreferenced file (invisible, cheap to sweep later), which
 * is far better than a row pointing at bytes that no longer exist and
 * rendering as a permanently broken link.
 */
async function deleteFile(
  table: "documents" | "bike_photos",
  bucket: string,
  id: string,
  stockNumber: string
): Promise<FileActionState> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to delete files." };
  }

  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from(table)
    .select("storage_path, created_by")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { error: `Could not delete: ${readError.message}` };
  if (!row) return { error: "That file no longer exists." };

  // Mirrors the RLS policy: staff may remove their own uploads, admins any.
  if (!isAdmin(profile) && row.created_by !== profile?.id) {
    return { error: "You can only delete files you uploaded." };
  }

  const { data: deleted, error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (deleteError) return { error: `Could not delete: ${deleteError.message}` };
  if (!deleted) return { error: "That file could not be deleted." };

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([row.storage_path]);

  if (storageError) {
    // The user's intent succeeded — the file is gone from the app. Log the
    // stranded object rather than reporting a failure that didn't happen.
    console.error(
      `[storage] orphaned object ${bucket}/${row.storage_path}:`,
      storageError.message
    );
  }

  revalidatePath(`/bikes/${stockNumber}`);
  return { ok: true };
}

// Every export from a "use server" module must be an async function — a
// sync function returning a promise is rejected at build time.
export async function deleteDocument(id: string, stockNumber: string) {
  return deleteFile("documents", DOCUMENTS_BUCKET, id, stockNumber);
}

export async function deletePhoto(id: string, stockNumber: string) {
  return deleteFile("bike_photos", PHOTOS_BUCKET, id, stockNumber);
}

/** Mints a short-lived download link on demand rather than in page HTML. */
export async function getDownloadUrl(
  kind: "document" | "photo",
  storagePath: string,
  filename: string
): Promise<FileActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const url = await createDownloadUrl(
    kind === "document" ? DOCUMENTS_BUCKET : PHOTOS_BUCKET,
    storagePath,
    filename
  );

  if (!url) return { error: "Could not prepare that download." };
  return { ok: true, url };
}

/** Cleans up a Storage object whose database row failed to insert. */
export async function discardOrphanedUpload(
  kind: "document" | "photo",
  storagePath: string
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) return;

  const supabase = await createClient();
  await supabase.storage
    .from(kind === "document" ? DOCUMENTS_BUCKET : PHOTOS_BUCKET)
    .remove([storagePath]);
}
