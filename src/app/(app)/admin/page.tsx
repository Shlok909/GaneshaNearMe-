import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Preview",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return (
    <main id="main-content" className="page-container">
      <AdminDashboard />
    </main>
  );
}
