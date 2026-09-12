import type { Metadata } from "next";
import { AddPandalForm } from "@/components/AddPandalForm";

export const metadata: Metadata = { title: "Share Your Ganapati" };
export default function AddPage() {
  return (
    <main id="main-content" className="page-container">
      <AddPandalForm />
    </main>
  );
}
