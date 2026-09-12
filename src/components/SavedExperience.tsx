"use client";

import { Bookmark, Heart } from "lucide-react";
import { usePublicPandals, useSavedPandals } from "@/lib/hooks";
import { EmptyState } from "./EmptyState";
import { PandalCard } from "./PandalCard";
import { useFeedback } from "./ui/Feedback";

export function SavedExperience() {
  const { ids, toggle } = useSavedPandals();
  const pandals = usePublicPandals();
  const saved = pandals.filter((pandal) => ids.includes(pandal.id));
  const notify = useFeedback();
  return (
    <>
      <div className="page-heading saved-heading">
        <div>
          <p className="eyebrow">
            <Heart size={15} />A little closer to your heart
          </p>
          <h1>
            Your saved Ganapatis
            <span className="count-badge">{saved.length}</span>
          </h1>
          <p>All the places you’d love to visit, in one happy little list.</p>
        </div>
        <span className="saved-heading-icon">
          <Bookmark size={28} />
        </span>
      </div>
      {saved.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="card-grid">
            {saved.map((pandal) => (
              <PandalCard
                key={pandal.id}
                pandal={pandal}
                onRemove={() => {
                  const persisted = toggle(pandal.id);
                  notify(
                    persisted
                      ? "Removed from your saved Ganapatis"
                      : "Removed for this visit. Browser storage is unavailable.",
                    persisted ? "success" : "info",
                  );
                }}
              />
            ))}
          </div>
          <p className="saved-footnote">
            Good company. Comfortable shoes. A list full of Bappa.
          </p>
        </>
      )}
    </>
  );
}
