import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via cookies, so it must be created
 * fresh per request rather than reused across requests.
 *
 * @param persistSession When false (the login form's unchecked "Remember
 *   me"), auth cookies are written without Max-Age/Expires so the browser
 *   drops them at the end of the session instead of the multi-week lifetime
 *   Supabase sets by default. Only meaningful for the client that performs
 *   the sign-in — later requests just read whatever cookie already exists.
 */
export async function createClient({
  persistSession = true,
}: { persistSession?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = persistSession
                ? options
                : { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // Called from a Server Component that can't set cookies (e.g.
            // during static rendering). Safe to ignore when session refresh
            // is also handled in proxy.ts.
          }
        },
      },
    }
  );
}
