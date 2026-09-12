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
  const [selectedImage, setSelectedImage] = useState(pandal.image);
  return (
    <>
      <div className="preview-hero">
        <Image
          src={selectedImage}
          alt={
            selectedImage === pandal.image
              ? `Illustration of ${pandal.name}`
              : `Illustration of decorations at ${pandal.name}`
          }
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          priority
        />
        <span className="illustration-label">Pandal illustration</span>
      </div>
      <div className="preview-body">
        <div className="preview-meta">
          <span>
            <MapPin size={15} />
            {pandal.area}
          </span>
          {pandal.verified && (
            <VerifiedBadge
              label={
                pandal.id.startsWith("demo-")
                  ? "Demo verified"
                  : "Locally approved"
              }
            />
          )}
        </div>
        <h2>{pandal.name}</h2>
        <CategoryBadge category={pandal.category} />
        <p className="preview-description">{pandal.description}</p>
        <div className="theme-box">
          <Sparkles size={18} />
          <div>
            <h3>A peek at the theme</h3>
            <p>{pandal.theme}</p>
          </div>
        </div>
        <div className="preview-gallery">
          {[pandal.image, ...pandal.gallery].map((src, index) => (
            <button
              type="button"
              key={src}
              aria-label={`View ${index === 0 ? "Ganapati" : index === 1 ? "pandal" : "decoration"} illustration`}
              aria-pressed={selectedImage === src}
              onClick={() => setSelectedImage(src)}
            >
              <Image
                src={src}
                alt={
                  index === 0
                    ? "Ganapati illustration"
                    : "Pandal decoration illustration"
                }
                fill
                sizes="120px"
              />
            </button>
          ))}
          {pandal.distanceKm !== undefined && (
            <span>
              <Navigation size={16} />
              {formatDistance(pandal.distanceKm)}
              <span>Straight-line distance</span>
            </span>
          )}
        </div>
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
