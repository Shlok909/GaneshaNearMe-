"use client";

import Image from "next/image";
import { useListingPhotos } from "@/hooks/useListingPhotos";
import type { PhotoKind, PhotoPaths } from "@/lib/types";

export const photoPlaceholders: Record<PhotoKind, string> = {
  ganapati: "/illustrations/pandal.svg",
  decoration: "/illustrations/decoration.svg",
};
export const photoLabels: Record<PhotoKind, string> = {
  ganapati: "Ganapati",
  decoration: "Decoration",
};

export function ListingPhoto({
  paths,
  name,
  kind = "ganapati",
  sizes,
}: {
  paths?: PhotoPaths;
  name: string;
  kind?: PhotoKind;
  sizes: string;
}) {
  const photos = useListingPhotos(paths);
  const photo = photos[kind][0];
  return (
    <Image
      src={photo?.url ?? photoPlaceholders[kind]}
      alt={
        photo
          ? `${photoLabels[kind]} photo of ${name}`
          : `${photoLabels[kind]} photo placeholder`
      }
      fill
      sizes={sizes}
      unoptimized
      onError={photo ? photos.onError : undefined}
    />
  );
}
