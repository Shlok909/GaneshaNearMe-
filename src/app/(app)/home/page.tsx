import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Explore Ganapatis" };

export default async function HomePage() {
  await requireUser("/home");
  return (
    <Suspense
      fallback={
        <main id="main-content" className="page-container">
          <div className="skeleton skeleton-heading" />
          <div
            className="skeleton skeleton-map"
            aria-label="Loading discovery map"
          />
        </main>
      }
    >
      <HomeExperience />
    </Suspense>
  );
}
