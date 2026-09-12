import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Navigation, Trash2 } from "lucide-react";
import type { Pandal } from "@/lib/types";
import { VerifiedBadge } from "./ui/VerifiedBadge";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { formatDistance } from "@/lib/geo";
import { CategoryBadge } from "./CategoryBadge";

export function PandalCard({
  pandal,
  onSelect,
  onRemove,
  compact = false,
}: {
  pandal: Pandal;
  onSelect?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  if (compact && onSelect)
    return (
      <button
        type="button"
        id={`list-${pandal.id}`}
        className="nearby-card"
        onClick={onSelect}
      >
        <span className="nearby-image">
          <Image
            src={pandal.image}
            alt={`Illustration of ${pandal.name}`}
            fill
            sizes="80px"
          />
        </span>
        <span className="nearby-info">
          <span className="nearby-name">{pandal.name}</span>
          <span className="nearby-area">
            <MapPin size={12} />
            {pandal.area}
          </span>
          <span className="nearby-distance">
            {formatDistance(pandal.distanceKm)}{" "}
            {pandal.verified && (
              <span>
                <span className="tiny-dot" />{" "}
                {pandal.id.startsWith("demo-")
                  ? "Demo verified"
                  : "Locally approved"}
              </span>
            )}
          </span>
        </span>
        <ArrowUpRight size={17} className="shrink-0 text-stone-400" />
      </button>
    );
  return (
    <article className="pandal-card">
      <div className="pandal-card-image">
        <Image
          src={pandal.image}
          alt={`Illustration of Ganapati at ${pandal.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {pandal.verified && (
          <VerifiedBadge
            label={
              pandal.id.startsWith("demo-")
                ? "Demo verified"
                : "Locally approved"
            }
          />
        )}
        <SaveButton id={pandal.id} compact />
      </div>
      <div className="pandal-card-body">
        <div className="card-area">
          <span>
            <MapPin size={14} />
            {pandal.area}
          </span>
          {pandal.distanceKm !== undefined && (
            <span>
              <Navigation size={12} />
              {formatDistance(pandal.distanceKm)}
            </span>
          )}
        </div>
        <h2>{pandal.name}</h2>
        <CategoryBadge category={pandal.category} />
        <p>{pandal.description}</p>
        <div className="pandal-card-actions">
          <Link
            href={`/home?pandal=${pandal.id}`}
            className="button button-primary button-small"
          >
            View
            <ArrowUpRight size={17} />
          </Link>
          <ShareButton id={pandal.id} name={pandal.name} short />
          {onRemove && (
            <button
              type="button"
              className="icon-button remove-button"
              aria-label={`Remove ${pandal.name}`}
              onClick={onRemove}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
