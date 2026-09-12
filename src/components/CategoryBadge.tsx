import { Sparkles, UsersRound } from "lucide-react";
import type { PandalCategory } from "@/lib/types";

export function CategoryBadge({ category }: { category?: PandalCategory }) {
  if (!category) return null;
  return (
    <span className={`category-badge ${category}`}>
      {category === "featured" ? (
        <Sparkles size={13} />
      ) : (
        <UsersRound size={13} />
      )}
      {category === "featured" ? "Featured Public Pandal" : "Community Pandal"}
    </span>
  );
}
