/**
 * Storage conventions shared by client upload code and server signing code.
 *
 * Object paths are namespaced by bike id — `{bikeId}/{uuid}-{filename}` — so
 * everything for one bike lives together and a future per-bike storage policy
 * can key off the leading path segment (ARCHITECTURE.md §5).
 */

export const DOCUMENTS_BUCKET = "documents";
export const PHOTOS_BUCKET = "photos";

/** Kept in step with 005_storage_constraints.sql — Storage is the real gate. */
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Accept attribute for the file picker. */
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt";
export const PHOTO_ACCEPT = "image/*";

/**
 * Strips path separators and exotic characters from a user-supplied filename.
 * Storage keys are URL paths — an unsanitised name can break the key or
 * escape the bike's folder.
 */
export function sanitizeFilename(name: string): string {
  const trimmed = name.trim().slice(0, 120);
  const cleaned = trimmed
    .replace(/[/\\]/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "");
  return cleaned || "file";
}

/** Collision-proof object key for a bike's file. */
export function buildStoragePath(bikeId: string, filename: string): string {
  return `${bikeId}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

export function isImageMimeType(mimeType: string | null): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

/** Human-readable reason a file was rejected, or null when acceptable. */
export function validateFile(
  file: File,
  { maxBytes, mimeTypes }: { maxBytes: number; mimeTypes: string[] }
): string | null {
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return `"${file.name}" is larger than ${mb}MB.`;
  }
  // Browsers occasionally report an empty type for uncommon extensions; let
  // Storage make the final call rather than blocking a legitimate upload.
  if (file.type && !mimeTypes.includes(file.type)) {
    return `"${file.name}" is not an accepted file type.`;
  }
  return null;
}
