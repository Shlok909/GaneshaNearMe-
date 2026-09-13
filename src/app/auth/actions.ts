"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AUTH_CONFIG_MESSAGE, getSupabaseConfig } from "@/lib/supabase/config";
import {
  authErrorMessage,
  validateAuth,
  validateName,
} from "@/lib/auth/validation";
import { confirmationUrl, safeNextPath } from "@/lib/auth/redirects";

export async function authenticate(
  mode: "login" | "signup",
  data: FormData,
  next: string,
) {
  if (mode !== "login" && mode !== "signup")
    return { error: "Please choose Login or Sign Up." };
  const errors = validateAuth(data, mode);
  if (Object.keys(errors).length) return { errors };
  if (!getSupabaseConfig()) return { error: AUTH_CONFIG_MESSAGE };
  try {
    const supabase = await createClient();
    const credentials = {
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
    };
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            ...credentials,
            options: {
              data: { full_name: String(data.get("name")).trim() },
              emailRedirectTo: confirmationUrl(),
            },
          })
        : await supabase.auth.signInWithPassword(credentials);
    if (result.error) return { error: authErrorMessage(result.error, mode) };
    if (mode === "signup" && !result.data.session) return { checkEmail: true };
    if (!result.data.session) return { error: authErrorMessage({}, mode) };
    revalidatePath("/", "layout");
    return { redirectTo: safeNextPath(next) };
  } catch {
    return { error: authErrorMessage({}, mode) };
  }
}

export async function updateProfile(data: FormData) {
  const name = String(data.get("name") ?? "").trim();
  const validationError = validateName(name);
  if (validationError) return { error: validationError };
  if (!getSupabaseConfig()) return { error: AUTH_CONFIG_MESSAGE };
  try {
    const supabase = await createClient();
    const { data: identity, error: identityError } =
      await supabase.auth.getUser();
    if (identityError || !identity.user)
      return { error: "Your session has ended. Please sign in again." };
    const { data: profile, error } = await supabase.from("profiles")
      .update({ full_name: name }).eq("id", identity.user.id).select("id").maybeSingle();
    if (error || !profile) return { error: "Your profile could not be saved. Please try again." };
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: authErrorMessage({}, "profile") };
  }
}

export async function logout() {
  if (!getSupabaseConfig()) return { error: AUTH_CONFIG_MESSAGE };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { error: authErrorMessage(error, "logout") };
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: authErrorMessage({}, "logout") };
  }
}
