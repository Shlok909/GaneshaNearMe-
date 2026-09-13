import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import { requireUser } from "@/lib/auth/session";
import { getAccount } from "@/lib/auth/account";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GnM Admin",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  await requireUser("/admin");
  const account = await getAccount();
  if (!account.isAdmin) return <main id="main-content" className="page-container">
    <div className="page-heading"><h1>{account.roleError ? "Access check unavailable" : "Administrator access required"}</h1>
      <p>{account.roleError ? "We couldn't verify your role. Please reload and try again." : "Your account does not have access to the admin dashboard."}</p>
      <Link href="/home" className="button button-primary">Back to exploring</Link>
    </div>
  </main>;
  return (
    <main id="main-content" className="page-container">
      <AdminDashboard />
    </main>
  );
}
