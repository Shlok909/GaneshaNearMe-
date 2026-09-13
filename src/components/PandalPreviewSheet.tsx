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
import type { PhotoKind } from "@/lib/types";
import { photoLabels, photoPlaceholders } from "./ListingPhoto";
import { PhotoThumbnails } from "./PhotoThumbnails";

export function PandalPreviewSheet({
  pandal,
  onClose,
  returnFocusId,
  onShowRoute,
}: {
  pandal: Pandal | null;
  onClose: () => void;
  returnFocusId?: string;
  onShowRoute?: () => void;
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
      {pandal && <PreviewContent key={pandal.id} pandal={pandal} onShowRoute={onShowRoute} />}
    </Modal>
  );
}

function PreviewContent({ pandal, onShowRoute }: { pandal: Pandal; onShowRoute?: () => void }) {
  const photos = useListingPhotos(pandal.photos);
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
          onError={selected ? photos.onError : undefined}
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
          {pandal.verified && <VerifiedBadge label="Approved" />}
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
          onError={photos.onError}
        />
        {(photos.status === "missing" || photos.status === "error") && (
          <p className="photo-availability-note">
            {photos.status === "error"
              ? "Photos could not be loaded. Please retry."
              : "Photos are not available for this listing."}
            {photos.status === "error" && <button type="button" className="text-link" onClick={photos.retry}>Retry photos</button>}
          </p>
        )}
        {pandal.distanceKm !== undefined && (
          <p className="photo-distance">
            <Navigation size={16} />
            {formatDistance(pandal.distanceKm)} · Straight-line distance
          </p>
        )}
        <div className="preview-actions">
          <SaveButton id={pandal.id} />
          <ShareButton id={pandal.id} name={pandal.name} />
          {onShowRoute && <button type="button" className="button button-primary directions-button" onClick={onShowRoute}><Navigation size={18} />Show route on map</button>}
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
