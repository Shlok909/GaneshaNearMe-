"use client";

import Image from "next/image";
import { useState } from "react";
import { useListingPhotos } from "@/hooks/useListingPhotos";
import type { PhotoKind } from "@/lib/local-photos";
import { PhotoThumbnails } from "./PhotoThumbnails";
import { photoLabels, photoPlaceholders } from "./ListingPhoto";

export function StoredSubmissionPhotos({
  photoSetId,
  name,
}: {
  photoSetId?: string;
  name: string;
}) {
  const photos = useListingPhotos(photoSetId);
  const [selected, setSelected] = useState<{ kind: PhotoKind; index: number }>({
    kind: "ganapati",
    index: 0,
  });
  const index = Math.min(
    selected.index,
    Math.max(0, photos[selected.kind].length - 1),
  );
  const photo = photos[selected.kind][index];
  return (
    <div className="review-saved-photos">
      <div className="review-photo-hero">
        <Image
          src={photo?.url ?? photoPlaceholders[selected.kind]}
          alt={
            photo
              ? `${photoLabels[selected.kind]} photo of ${name}`
              : `${photoLabels[selected.kind]} photo placeholder`
          }
          fill
          sizes="(max-width: 640px) 90vw, 500px"
          unoptimized
        />
      </div>
      <PhotoThumbnails
        photos={photos}
        selected={{ kind: selected.kind, index }}
        onSelect={setSelected}
      />
      {(photos.status === "missing" || photos.status === "error") && (
        <p className="photo-availability-note">
          No readable image files are saved for this listing. Attach the
          original photos below.
        </p>
      )}
    </div>
  );
}
