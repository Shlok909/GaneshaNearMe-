import { isValidCoordinates } from "./geo";
import {
  isNonTrivialName,
  isValidIndianPhone,
  type EligibilityInput,
} from "./submission-eligibility";
import type { SubmissionStatus } from "./types";

export const MAX_SUBMISSION_SCORE = 11;
export const AUTO_APPROVAL_THRESHOLD = 7;
export const MANUAL_REVIEW_THRESHOLD = 3;
export const CRITERIA = {
  mandalName: { label: "Mandal Name", maximum: 2 },
  location: { label: "Exact Location", maximum: 2 },
  submitter: { label: "Submitter Identity", maximum: 2 },
  contact: { label: "Contact", maximum: 2 },
  images: { label: "Images", maximum: 2 },
  publicAccess: { label: "Public Access", maximum: 1 },
} as const;

export function statusForScore(score: number): SubmissionStatus {
  return score >= AUTO_APPROVAL_THRESHOLD
    ? "approved"
    : score >= MANUAL_REVIEW_THRESHOLD
      ? "manual_review"
      : "rejected";
}

// UI explanation only. finalize_pandal_submission computes the authoritative score.
export function evaluateGanapatiSubmission(input: EligibilityInput) {
  const validity = {
    mandalName: isNonTrivialName(input.mandalName),
    location: isValidCoordinates(input.coordinates),
    submitter:
      isNonTrivialName(input.submitterName, 2) &&
      ["Mandal Organizer", "Volunteer"].includes(input.submitterRole),
    contact: isValidIndianPhone(input.contact),
    images:
      Number.isInteger(input.ganapatiPhotoCount) &&
      input.ganapatiPhotoCount >= 1 &&
      input.ganapatiPhotoCount <= 2 &&
      Number.isInteger(input.decorationPhotoCount) &&
      input.decorationPhotoCount >= 1 &&
      input.decorationPhotoCount <= 3,
    publicAccess: input.publicAccess === true,
  };
  const criteria = Object.fromEntries(
    Object.entries(CRITERIA).map(([key, rule]) => {
      const valid = validity[key as keyof typeof validity];
      return [key, { points: valid ? rule.maximum : 0, valid }];
    }),
  ) as Record<keyof typeof CRITERIA, { points: number; valid: boolean }>;
  const totalScore = Object.values(criteria).reduce(
    (sum, criterion) => sum + criterion.points,
    0,
  );
  const status = statusForScore(totalScore);
  const reasons = Object.entries(criteria)
    .filter(([, criterion]) => !criterion.valid)
    .map(
      ([key]) =>
        CRITERIA[key as keyof typeof CRITERIA].label +
        " needs valid information.",
    );
  if (!validity.publicAccess)
    reasons.push("Private Ganapatis cannot appear on the public map.");
  return { totalScore, status, criteria, reasons };
}
