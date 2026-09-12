import type { Metadata } from "next";
import { ProfileExperience } from "@/components/ProfileExperience";
import { requireUser } from "@/lib/auth/session";
import { profileFromUser } from "@/lib/auth/user";

export const metadata: Metadata = { title: "My Profile" };
export default async function ProfilePage() {
  const user = profileFromUser(await requireUser("/profile"));
  return (
    <main id="main-content" className="page-container">
      <ProfileExperience user={user} />
    </main>
  );
}
