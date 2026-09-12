"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedPandals } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useFeedback } from "./ui/Feedback";

export function SaveButton({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const { ids, toggle } = useSavedPandals();
  const notify = useFeedback();
  const saved = ids.includes(id);
  return (
    <button
      type="button"
      className={cn(
        compact ? "card-save icon-button" : "button button-primary",
        saved && "is-saved",
      )}
      aria-label={
        compact ? (saved ? "Remove from saved" : "Save Ganapati") : undefined
      }
      aria-pressed={saved}
      onClick={() => {
        const persisted = toggle(id);
        notify(
          persisted
            ? saved
              ? "Removed from your saved Ganapatis"
              : "Added to your saved Ganapatis"
            : "Saved for this visit. Browser storage is unavailable.",
          persisted ? "success" : "info",
        );
      }}
    >
      {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
