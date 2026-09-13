import type { User } from "@supabase/supabase-js";

export type ProfileUser = {
  name: string;
  email: string;
  initials: string;
  memberSince: string;
};

export function profileFromUser(user: User, databaseName?: string): ProfileUser {
  const name =
    databaseName !== undefined ? databaseName : typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim().slice(0, 80)
      : "";
  const email = user.email ?? "";
  const date = new Date(user.created_at);
  return {
    name: name || email.split("@")[0] || "Your account",
    email,
    initials: name
      ? name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => Array.from(part)[0])
          .join("")
          .toUpperCase()
      : (Array.from(email)[0] || "G").toUpperCase(),
    memberSince: Number.isNaN(date.getTime())
      ? "Unavailable"
      : new Intl.DateTimeFormat("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(date),
  };
}
