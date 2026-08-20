import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET, PHOTOS_BUCKET } from "@/lib/storage";

/**
 * Both buckets are private, so nothing renders or downloads without a signed
 * URL minted server-side under the caller's session. Storage RLS is checked
 * at signing time, so a viewer who cannot read a bike cannot obtain a link to
 * its files either.
 */

/** Long enough to browse a bike record, short enough that a leaked link dies. */
const VIEW_TTL_SECONDS = 60 * 60;

/**
 * Signs many paths in one round trip. Returns a path→URL map rather than an
 * array so callers can look up by path without index-matching, and so a
 * single failed path doesn't shift every other result.
 */
async function signMany(
  bucket: string,
  paths: string[],
  expiresIn = VIEW_TTL_SECONDS
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error) {
    // A broken thumbnail is better than a 500 on the whole bike page.
    console.error(`[storage] failed to sign ${bucket} URLs:`, error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  }
  return map;
}

export function signPhotoUrls(paths: string[]) {
  return signMany(PHOTOS_BUCKET, paths);
}

export function signDocumentUrls(paths: string[]) {
  return signMany(DOCUMENTS_BUCKET, paths);
}

/**
 * Single download link. `download` makes Storage set a
 * Content-Disposition attachment header with the original filename, so the
 * browser saves it rather than navigating to it.
 */
export async function createDownloadUrl(
  bucket: string,
  path: string,
  filename?: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60, filename ? { download: filename } : undefined);

  if (error) {
    console.error(`[storage] failed to sign download:`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
