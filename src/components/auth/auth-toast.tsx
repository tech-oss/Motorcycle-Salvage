"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const TOAST_MESSAGES: Record<string, string> = {
  "signed-out": "Signed out successfully.",
};

/**
 * Fires a toast from a `?toast=` query param, then strips it from the URL.
 * Server Actions that redirect (sign-out) can't show client toast state
 * directly — the redirect target reads this instead.
 */
export function AuthToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("toast");

  useEffect(() => {
    if (!key) return;
    const message = TOAST_MESSAGES[key];
    if (message) toast.success(message);

    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
    // Deliberately excludes `router`/`searchParams` — this must fire once per
    // mount for the param that was present on load, not re-run as the URL it
    // just rewrote changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
