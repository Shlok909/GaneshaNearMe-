import type { Metadata } from "next";
import { SavedExperience } from "@/components/SavedExperience";

export const metadata: Metadata = { title: "Saved Ganapatis" };
export default function SavedPage() {
  return (
    <main id="main-content" className="page-container">
      <SavedExperience />
    </main>
  );
}
