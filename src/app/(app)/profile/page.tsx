import type { Metadata } from "next";
import { ProfileExperience } from "@/components/ProfileExperience";
import { requireUser } from "@/lib/auth/session";
import { getAccount } from "@/lib/auth/account";

export const metadata: Metadata = { title: "My Profile" };
export default async function ProfilePage() {
  await requireUser("/profile");
  const { user, isAdmin, profileError } = await getAccount();
  return (
    <main id="main-content" className="page-container">
      <ProfileExperience user={user} isAdmin={isAdmin} profileError={profileError} />
    </main>
  );
}
