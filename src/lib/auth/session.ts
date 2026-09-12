import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { getSupabaseConfig } from "../supabase/config";
import { safeNextPath } from "./redirects";

// React cache deduplicates within this render/request, never between users.
export const getVerifiedUser = cache(async () => {
  if (!getSupabaseConfig()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
});

export async function requireUser(next = "/home") {
  const user = await getVerifiedUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(safeNextPath(next))}`);
  return user;
}
