import { isValidCoordinates } from "./geo";
import type { Coordinates } from "./types";

export const PUBLIC_ACCESS_MESSAGE =
  "GaneshaNearMe currently lists only Ganapatis that are open to the general public.";
export type EligibilityInput = {
  mandalName: string;
  coordinates: Coordinates | null;
  submitterName: string;
  submitterRole: string;
  contact: string;
  ganapatiPhotoCount: number;
  decorationPhotoCount: number;
  publicAccess: boolean;
};

export function normalizeIndianPhone(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`;
  if (/^0091[6-9]\d{9}$/.test(compact)) return `+${compact.slice(2)}`;
  return compact;
}

export function isValidIndianPhone(value: string) {
  return /^\+91[6-9]\d{9}$/.test(normalizeIndianPhone(value));
}

export function isNonTrivialName(value: string, minimumLetters = 3) {
  const letters = value.trim().toLocaleLowerCase().match(/\p{L}/gu) ?? [];
  return (
    value.trim().length <= 160 &&
    letters.length >= minimumLetters &&
    new Set(letters).size > 1
  );
}

// Inline field guidance is separate from the score-based moderation decision.
export function getSubmissionFieldErrors(input: EligibilityInput) {
  const errors: Record<string, string> = {};
  if (!isNonTrivialName(input.mandalName))
    errors.mandalName = "Enter a valid, non-trivial Mandal name.";
  if (!isValidCoordinates(input.coordinates))
    errors.coordinates = "Choose an exact location on the map.";
  if (!isNonTrivialName(input.submitterName, 2))
    errors.name = "Enter your name.";
  if (!["Mandal Organizer", "Volunteer"].includes(input.submitterRole))
    errors.role = "Choose Mandal Organizer or Volunteer.";
  if (!isValidIndianPhone(input.contact))
    errors.phone = "Enter a valid contact number.";
  if (
    !Number.isInteger(input.ganapatiPhotoCount) ||
    input.ganapatiPhotoCount < 1 ||
    input.ganapatiPhotoCount > 2
  )
    errors["ganapati-photos"] = "Upload 1–2 Ganapati photos.";
  if (
    !Number.isInteger(input.decorationPhotoCount) ||
    input.decorationPhotoCount < 1 ||
    input.decorationPhotoCount > 3
  )
    errors["decoration-photos"] = "Upload 1–3 Pandal/Decoration photos.";
  if (input.publicAccess !== true) errors.isPublic = PUBLIC_ACCESS_MESSAGE;
  return errors;
}
