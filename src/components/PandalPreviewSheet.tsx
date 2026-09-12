"use client";

import Image from "next/image";
import { MapPin, Navigation, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Pandal } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { VerifiedBadge } from "./ui/VerifiedBadge";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { formatDistance } from "@/lib/geo";
import { createGoogleMapsDirectionsUrl } from "@/lib/maps-links";
import { CategoryBadge } from "./CategoryBadge";
import { useListingPhotos } from "@/hooks/useListingPhotos";
import type { PhotoKind } from "@/lib/local-photos";
import { photoLabels, photoPlaceholders } from "./ListingPhoto";
import { PhotoThumbnails } from "./PhotoThumbnails";
import { ListingPhotoEditor } from "./ListingPhotoEditor";

export function PandalPreviewSheet({
  pandal,
  onClose,
  returnFocusId,
}: {
  pandal: Pandal | null;
  onClose: () => void;
  returnFocusId?: string;
}) {
  return (
    <Modal
      open={pandal !== null}
      onClose={onClose}
      title={pandal?.name ?? "Ganapati details"}
      description="Explore this pandal, save it or share its location."
      className="pandal-preview"
      returnFocusId={returnFocusId}
    >
      {pandal && <PreviewContent key={pandal.id} pandal={pandal} />}
    </Modal>
  );
}

function PreviewContent({ pandal }: { pandal: Pandal }) {
  const photos = useListingPhotos(pandal.photoSetId);
  const [selection, setSelection] = useState<{
    kind: PhotoKind;
    index: number;
  }>({ kind: "ganapati", index: 0 });
  const index = Math.min(
    selection.index,
    Math.max(0, photos[selection.kind].length - 1),
  );
  const selected = photos[selection.kind][index];
  const selectedImage = selected?.url ?? photoPlaceholders[selection.kind];
  return (
    <>
      <div className="preview-hero">
        <Image
          src={selectedImage}
          alt={
            selected
              ? `${photoLabels[selection.kind]} photo of ${pandal.name}`
              : `${photoLabels[selection.kind]} photo placeholder`
          }
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          priority
          unoptimized
        />
        <span className="illustration-label">
          {selected
            ? `${photoLabels[selection.kind]} photo`
            : photos.status === "loading"
              ? "Loading photos…"
              : `${photoLabels[selection.kind]} placeholder`}
        </span>
      </div>
      <div className="preview-body">
        <div className="preview-meta">
          <span>
            <MapPin size={15} />
            {pandal.area}
          </span>
          {pandal.verified && <VerifiedBadge label={"Locally approved"} />}
        </div>
        <h2>{pandal.name}</h2>
        <CategoryBadge category={pandal.category} />
        <p className="preview-description">{pandal.description}</p>
        <div className="theme-box">
          <Sparkles size={18} />
          <div>
            <h3>About this listing</h3>
            <p>{pandal.theme}</p>
          </div>
        </div>
        <PhotoThumbnails
          photos={photos}
          selected={{ kind: selection.kind, index }}
          onSelect={setSelection}
        />
        {(photos.status === "missing" || photos.status === "error") && (
          <p className="photo-availability-note">
            {photos.status === "error"
              ? "Saved photos could not be loaded. Check browser storage or attach the originals again."
              : "No image files are saved for this listing. Earlier submissions kept filenames only; attach the originals below."}
          </p>
        )}
        <ListingPhotoEditor listingId={pandal.id} />
        {pandal.distanceKm !== undefined && (
          <p className="photo-distance">
            <Navigation size={16} />
            {formatDistance(pandal.distanceKm)} · Straight-line distance
          </p>
        )}
        <div className="preview-actions">
          <SaveButton id={pandal.id} />
          <ShareButton id={pandal.id} name={pandal.name} />
          <a
            className="button button-secondary directions-button"
            href={createGoogleMapsDirectionsUrl({
              destination: pandal.coordinates,
            })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation size={18} />
            Get Directions
          </a>
        </div>
      </div>
    </>
  );
}
