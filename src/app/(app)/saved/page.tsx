import type { Metadata } from "next";
import { SavedExperience } from "@/components/SavedExperience";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Saved Ganapatis" };
export default async function SavedPage() {
  await requireUser("/saved");
  return (
    <main id="main-content" className="page-container">
      <SavedExperience />
    </main>
  );
}
