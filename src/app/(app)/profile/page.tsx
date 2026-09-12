import type { Metadata } from "next";
import { ProfileExperience } from "@/components/ProfileExperience";

export const metadata: Metadata = { title: "My Profile" };
export default function ProfilePage() {
  return (
    <main id="main-content" className="page-container">
      <ProfileExperience />
    </main>
  );
}
