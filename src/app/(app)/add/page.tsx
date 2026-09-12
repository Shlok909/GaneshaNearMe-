import type { Metadata } from "next";
import { AddPandalForm } from "@/components/AddPandalForm";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Share Your Ganapati" };
export default async function AddPage() {
  await requireUser("/add");
  return (
    <main id="main-content" className="page-container">
      <AddPandalForm />
    </main>
  );
}
