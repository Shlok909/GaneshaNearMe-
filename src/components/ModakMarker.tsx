import type { Pandal } from "@/lib/types";
import { ModakIcon } from "./Brand";
import { cn } from "@/lib/utils";

export function ModakMarker({
  pandal,
  selected,
  onClick,
}: {
  pandal: Pandal;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`marker-${pandal.id}`}
      className={cn("modak-marker", selected && "selected")}
      style={pandal.mapPosition}
      aria-label={`View ${pandal.name}, ${pandal.area}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="marker-symbol">
        <ModakIcon className="size-8" />
      </span>
      <span className="marker-label">{pandal.area}</span>
    </button>
  );
}
