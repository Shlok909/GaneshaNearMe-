"use client";

import Image from "next/image";
import { useState } from "react";
import { useListingPhotos } from "@/hooks/useListingPhotos";
import type { PhotoKind, PhotoPaths } from "@/lib/types";
import { PhotoThumbnails } from "./PhotoThumbnails";
import { photoLabels, photoPlaceholders } from "./ListingPhoto";

export function StoredSubmissionPhotos({
  paths,
  name,
}: {
  paths?: PhotoPaths;
  name: string;
}) {
  const photos = useListingPhotos(paths);
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
          onError={photo ? photos.onError : undefined}
        />
      </div>
      <PhotoThumbnails
        photos={photos}
        selected={{ kind: selected.kind, index }}
        onSelect={setSelected}
        onError={photos.onError}
      />
      {(photos.status === "missing" || photos.status === "error") && (
        <p className="photo-availability-note">
          Photos could not be loaded.
          <button type="button" className="text-link" onClick={photos.retry}>Retry photos</button>
        </p>
      )}
    </div>
  );
}
