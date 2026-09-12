"use client";

import Image from "next/image";
import type { PhotoPreview } from "@/hooks/useListingPhotos";
import type { PhotoKind } from "@/lib/local-photos";
import { photoLabels, photoPlaceholders } from "./ListingPhoto";

export function PhotoThumbnails({
  photos,
  selected,
  onSelect,
}: {
  photos: Record<PhotoKind, PhotoPreview[]>;
  selected: { kind: PhotoKind; index: number };
  onSelect: (selection: { kind: PhotoKind; index: number }) => void;
}) {
  return (
    <div className="listing-photo-groups">
      {(["ganapati", "decoration"] as const).map((kind) => {
        const items = photos[kind];
        const displayed = items.length
          ? items
          : [{ url: photoPlaceholders[kind], name: "" }];
        return (
          <section
            className="listing-photo-group"
            key={kind}
            aria-label={`${photoLabels[kind]} photos`}
          >
            <h3>
              {photoLabels[kind]} photos <span>{items.length}</span>
            </h3>
            <div className="preview-gallery">
              {displayed.map((photo, index) => (
                <button
                  key={photo.url}
                  type="button"
                  aria-label={
                    items.length
                      ? `View ${photoLabels[kind]} photo ${index + 1}`
                      : `View ${photoLabels[kind]} placeholder`
                  }
                  aria-pressed={
                    selected.kind === kind && selected.index === index
                  }
                  onClick={() => onSelect({ kind, index })}
                >
                  <Image
                    src={photo.url}
                    alt={
                      items.length
                        ? `${photoLabels[kind]} photo ${index + 1}: ${photo.name}`
                        : `${photoLabels[kind]} photo placeholder`
                    }
                    fill
                    sizes="100px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
            {!items.length && (
              <p>
                No saved {kind === "ganapati" ? "Ganapati" : "decoration"}{" "}
                photos yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
