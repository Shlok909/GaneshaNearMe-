"use client";

import Image from "next/image";
import { ChevronDown, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import type { Pandal, PhotoKind } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { VerifiedBadge } from "./ui/VerifiedBadge";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { formatDistance } from "@/lib/geo";
import { createGoogleMapsDirectionsUrl } from "@/lib/maps-links";
import { CategoryBadge } from "./CategoryBadge";
import { useListingPhotos } from "@/hooks/useListingPhotos";
import { photoLabels } from "./ListingPhoto";
import { PhotoThumbnails } from "./PhotoThumbnails";

export function PandalPreviewSheet({ pandal, loading = false, onClose, returnFocusId, onShowRoute }: {
  pandal: Pandal | null;
  loading?: boolean;
  onClose: () => void;
  returnFocusId?: string;
  onShowRoute?: () => void;
}) {
  return (
    <Modal
      open={pandal !== null || loading}
      onClose={onClose}
      title={pandal?.name ?? "Loading Ganapati details"}
      description="View Ganapati photos, expand the information, save or get directions."
      className="pandal-preview"
      focusContentOnOpen
      returnFocusId={returnFocusId}
    >
      {pandal ? <PreviewContent key={pandal.id} pandal={pandal} onShowRoute={onShowRoute} /> : (
        <div className="preview-initial-loading" aria-busy="true">
          <div className="preview-hero"><PhotoSkeleton label="Loading Ganapati…" /></div>
          <div className="preview-body" aria-hidden="true">
            <div className="preview-skeleton-line" />
            <div className="preview-skeleton-line short" />
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewContent({ pandal, onShowRoute }: { pandal: Pandal; onShowRoute?: () => void }) {
  const photos = useListingPhotos(pandal.photos);
  const [selection, setSelection] = useState<{ kind: PhotoKind; index: number }>({ kind: "ganapati", index: 0 });
  const index = Math.min(selection.index, Math.max(0, photos[selection.kind].length - 1));
  const photo = photos[selection.kind][index];
  return (
    <>
      <div className="preview-scroll">
        <PreviewPhoto
          key={`${photos.key}:${photo?.url ?? selection.kind}`}
          src={photo?.url}
          kind={selection.kind}
          name={pandal.name}
          status={photos.status}
          onRetry={photos.retry}
        />
        <div className="preview-body">
          <header className="preview-heading">
            <h2>{pandal.name}</h2>
            <p><MapPin size={14} aria-hidden="true" />{pandal.area}</p>
          </header>
          {photos.status === "ready" && <PhotoThumbnails
            photos={photos}
            selected={{ kind: selection.kind, index }}
            onSelect={setSelection}
            onError={photos.onError}
          />}
          <details className="preview-information">
            <summary>
              <span>Ganapati information</span>
              <ChevronDown size={19} aria-hidden="true" />
            </summary>
            <div className="preview-information-content">
              <div className="preview-badges">
                <CategoryBadge category={pandal.category} />
                {pandal.verified && <VerifiedBadge label="Approved" />}
              </div>
              <dl>
                <div><dt>About this Ganapati</dt><dd>{pandal.description}</dd></div>
                <div><dt>Theme & decoration</dt><dd>{pandal.theme}</dd></div>
                {pandal.distanceKm !== undefined && <div>
                  <dt>Distance from you</dt>
                  <dd>{formatDistance(pandal.distanceKm)} · Straight-line distance</dd>
                </div>}
              </dl>
              <a
                className="preview-external-directions text-link"
                href={createGoogleMapsDirectionsUrl({ destination: pandal.coordinates })}
                target="_blank"
                rel="noopener noreferrer"
              ><Navigation size={16} aria-hidden="true" />Get Directions<span className="sr-only"> in Google Maps (opens in a new tab)</span></a>
            </div>
          </details>
        </div>
      </div>
      <div className="preview-actions">
        {onShowRoute && <button type="button" className="button button-primary directions-button" onClick={onShowRoute}>
          <Navigation size={17} aria-hidden="true" />Show route on map
        </button>}
        <SaveButton id={pandal.id} />
        <ShareButton id={pandal.id} name={pandal.name} />
      </div>
    </>
  );
}

function PhotoSkeleton({ label }: { label: string }) {
  return <div className="preview-photo-skeleton" role="status">
    <Image src="/logoofapp.png" alt="GaneshaNearMe" width={64} height={64} unoptimized />
    <span>{label}</span>
    <span className="preview-skeleton-line" aria-hidden="true" />
  </div>;
}

function PreviewPhoto({ src, kind, name, status, onRetry }: {
  src?: string; kind: PhotoKind; name: string;
  status: ReturnType<typeof useListingPhotos>["status"];
  onRetry: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = status === "loading" || (!!src && !loaded && !failed);
  const error = status === "error" || failed;
  useEffect(() => {
    if (!src || loaded || failed) return;
    const timer = setTimeout(() => setFailed(true), 20_000);
    return () => clearTimeout(timer);
  }, [src, loaded, failed]);
  return <div className="preview-hero" aria-busy={pending}>
    {src && <Image
      className="preview-main-photo"
      src={src}
      alt={`${photoLabels[kind]} photo of ${name}`}
      fill
      sizes="(max-width: 460px) calc(100vw - 24px), 420px"
      loading="eager"
      fetchPriority="high"
      unoptimized
      style={{ opacity: loaded && !failed ? 1 : 0 }}
      onLoad={() => { setLoaded(true); setFailed(false); }}
      onError={() => setFailed(true)}
    />}
    {pending && <PhotoSkeleton label={`Loading ${photoLabels[kind]} photo…`} />}
    {!pending && (!src || error) && <div className="preview-photo-fallback" role={error ? "alert" : "status"}>
      <Image src="/logoofapp.png" alt="GaneshaNearMe" width={56} height={56} unoptimized />
      <p>{error ? "This photo could not be loaded." : `No ${photoLabels[kind]} photo is available yet.`}</p>
      {error && <button type="button" className="text-link" onClick={onRetry}>Retry photo</button>}
    </div>}
    {loaded && !failed && <span className="illustration-label">{photoLabels[kind]} photo</span>}
  </div>;
}
