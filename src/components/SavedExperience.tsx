"use client";

import { Bookmark, Heart } from "lucide-react";
import { usePublicPandals, useSavedPandals } from "@/lib/hooks";
import { EmptyState } from "./EmptyState";
import { PandalCard } from "./PandalCard";
import { useFeedback } from "./ui/Feedback";
import { usePandalData } from "./PandalDataProvider";

export function SavedExperience() {
  const { ids, toggle, pendingIds } = useSavedPandals();
  const { loading, savesLoading, error, savesError, refresh } = usePandalData();
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
      {loading || savesLoading ? <p role="status">Loading your saved Ganapatis…</p> : error || savesError ?
        <div className="data-feedback" role="alert"><p>{error || savesError}</p><button type="button" className="button button-secondary" onClick={refresh}>Retry</button></div>
      : saved.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="card-grid">
            {saved.map((pandal) => (
              <PandalCard
                key={pandal.id}
                pandal={pandal}
                removing={pendingIds.includes(pandal.id)}
                onRemove={async () => {
                  try { await toggle(pandal.id); notify("Removed from your saved Ganapatis", "success"); }
                  catch (cause) { notify(cause instanceof Error ? cause.message : "Please try again.", "info"); }
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
