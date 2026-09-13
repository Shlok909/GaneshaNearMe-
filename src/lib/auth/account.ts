import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./session";
import { profileFromUser } from "./user";

export const getAccount = cache(async () => {
  const identity = await requireUser();
  const client = await createClient();
  const [profile, role] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", identity.id).maybeSingle(),
    client.rpc("can_access_admin"),
  ]);
  return {
    id: identity.id,
    user: profileFromUser(identity, profile.data?.full_name ?? ""),
    isAdmin: !role.error && role.data === true,
    profileError: profile.error || !profile.data ? "Unable to load your profile right now. Please retry." : "",
    roleError: !!role.error,
  };
});
