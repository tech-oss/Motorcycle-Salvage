/**
 * Reads the public Supabase configuration, failing loudly and specifically if
 * it is missing. Without this a missing env var surfaces as an opaque fetch
 * error on every request, which is a miserable thing to debug.
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Missing Supabase configuration: ${missing}. ` +
        "Copy .env.example to .env.local and fill in the values from your " +
        "Supabase project (Project Settings → API)."
    );
  }

  return { url, anonKey };
}

/** True when Supabase is configured; lets callers degrade instead of crash. */
export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
