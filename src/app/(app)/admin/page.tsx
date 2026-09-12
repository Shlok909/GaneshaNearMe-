import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin Preview",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  await requireUser("/admin");
  // TODO Stage 3 Part 2: implement real admin authorization using secure
  // database/app metadata policy. This currently requires authentication only.
  return (
    <main id="main-content" className="page-container">
      <AdminDashboard />
    </main>
  );
}
