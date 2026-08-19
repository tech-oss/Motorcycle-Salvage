"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export type AuthState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * True when Supabase actually rejected the credentials, as opposed to the
 * request never getting there (DNS, bad URL, service down, wrong keys).
 */
function isCredentialError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, status } = error as { code?: string; status?: number };
  return (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    code === "email_not_confirmed" ||
    status === 400 ||
    status === 401
  );
}

/** Only allow relative, single-slash paths so ?redirect= can't send users off-site. */
function safeRedirect(target: FormDataEntryValue | null): string {
  const value = typeof target === "string" ? target : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

async function siteOrigin() {
  const headerList = await headers();
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;

  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const rememberMe = formData.get("rememberMe") === "on";
  const supabase = await createClient({ persistSession: rememberMe });
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // A rejected credential and an unreachable backend are very different
    // problems. Collapsing both into "wrong password" sends people hunting
    // for a typo when the real fault is configuration.
    if (isCredentialError(error)) {
      // Deliberately generic: distinguishing "no such user" from "wrong
      // password" tells an attacker which emails are registered.
      return { error: "Incorrect email or password." };
    }

    console.error("[auth] sign-in failed:", error);
    return {
      error:
        "Could not reach the authentication service. Check the Supabase " +
        "configuration and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("redirect")));
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user() trigger to populate profiles.full_name.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  return {
    success:
      "Account created. Check your email to confirm your address, then sign in. " +
      "An administrator will assign your role.",
  };
}

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success, even for unknown addresses — otherwise this
  // endpoint becomes a way to enumerate which emails have accounts.
  return {
    success:
      "If an account exists for that address, a password reset link is on its way.",
  };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  // The recovery link established a session; without one there is nothing to
  // update, and we must not silently appear to succeed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // The redirect target carries the toast trigger — signOut can't await a
  // client-side toast itself, since redirect() unmounts everything server-side.
  redirect("/login?toast=signed-out");
}
