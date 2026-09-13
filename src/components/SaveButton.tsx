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
  const { ids, toggle, pendingIds, loading, error, refresh } = useSavedPandals();
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
      disabled={loading || pendingIds.includes(id)}
      onClick={async () => {
        if (error) { refresh(); notify("Retrying your saved list…", "info"); return; }
        try {
          await toggle(id);
          notify(saved ? "Removed from your saved Ganapatis" : "Added to your saved Ganapatis", "success");
        } catch (cause) { notify(cause instanceof Error ? cause.message : "Please try again.", "info"); }
      }}
    >
      {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
      {!compact && (pendingIds.includes(id) ? "Saving…" : error ? "Retry saves" : saved ? "Saved" : "Save")}
    </button>
  );
}
