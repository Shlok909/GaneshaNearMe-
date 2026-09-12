import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";

export const metadata: Metadata = { title: "Explore Ganapatis" };

export default function HomePage() {
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
