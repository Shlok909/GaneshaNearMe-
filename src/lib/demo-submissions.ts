import { readStorage, writeStorage, storageKeys } from "./demo-storage";
import { isValidCoordinates } from "./geo";
import { normalizeIndianPhone } from "./submission-eligibility";
import { evaluateGanapatiSubmission } from "./submission-verification";
import {
  discardPhotoSet,
  photosFromFiles,
  readPhotoSet,
  storePhotoSet,
  EMPTY_PHOTOS,
  type PhotoFiles,
  type StoredPhoto,
} from "./local-photos";
import type {
  Pandal,
  PandalCategory,
  PhotoMetadata,
  Submission,
} from "./types";

export type SubmissionInput = Omit<
  Submission,
  | "id"
  | "submittedAt"
  | "score"
  | "verificationStatus"
  | "category"
  | "photoSetId"
>;
export function verificationInput(input: SubmissionInput) {
  return {
    ...input,
    ganapatiPhotoCount: input.ganapatiImages.count,
    decorationPhotoCount: input.decorationImages.count,
  };
}
function isPhotos(value: unknown, max: number): value is PhotoMetadata {
  if (
    !value ||
    typeof value !== "object" ||
    !("names" in value) ||
    !("count" in value)
  )
    return false;
  return (
    Array.isArray(value.names) &&
    value.names.length <= max &&
    value.count === value.names.length &&
    value.names.every((name) => typeof name === "string" && name.length <= 255)
  );
}
export function parseSubmissions(raw: string | null): Submission[] {
  try {
    const records: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(records)) return [];
    const seen = new Set<string>();
    return records.flatMap((record): Submission[] => {
      if (!record || typeof record !== "object") return [];
      const r = record as Record<string, unknown>;
      if (
        typeof r.id !== "string" ||
        !r.id.startsWith("local-") ||
        seen.has(r.id) ||
        typeof r.mandalName !== "string" ||
        typeof r.locationText !== "string" ||
        typeof r.submitterName !== "string" ||
        typeof r.submitterRole !== "string" ||
        typeof r.contact !== "string" ||
        typeof r.publicAccess !== "boolean" ||
        (r.coordinates !== null && !isValidCoordinates(r.coordinates)) ||
        !isPhotos(r.ganapatiImages, 2) ||
        !isPhotos(r.decorationImages, 3) ||
        typeof r.submittedAt !== "string" ||
        !Number.isFinite(Date.parse(r.submittedAt))
      )
        return [];
      // Preserve records from the earlier local-review preview. Reading old pending
      // records must not publish them automatically under the changed scoring rule.
      const status =
        r.verificationStatus ??
        (r.status === "pending_review" ? "manual_review" : r.status);
      const category = r.category ?? r.adminCategory ?? null;
      if (
        !["manual_review", "approved", "rejected"].includes(String(status)) ||
        ![null, "featured", "community"].includes(category as string | null)
      )
        return [];
      const input: SubmissionInput = {
        mandalName: r.mandalName,
        locationText: r.locationText,
        coordinates: r.coordinates as Submission["coordinates"],
        submitterName: r.submitterName,
        submitterRole: r.submitterRole,
        contact: r.contact,
        publicAccess: r.publicAccess,
        ganapatiImages: r.ganapatiImages,
        decorationImages: r.decorationImages,
      };
      const result = evaluateGanapatiSubmission(verificationInput(input));
      seen.add(r.id);
      return [
        {
          ...input,
          id: r.id,
          submittedAt: r.submittedAt,
          score: result.totalScore,
          verificationStatus:
            status === "approved" && !r.publicAccess
              ? "manual_review"
              : (status as Submission["verificationStatus"]),
          category: category as PandalCategory | null,
          ...(typeof r.photoSetId === "string" &&
          /^photos-[a-f0-9-]{36}$/.test(r.photoSetId)
            ? { photoSetId: r.photoSetId }
            : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}
export function getSubmissionsSnapshot() {
  return readStorage(storageKeys.submissions);
}
export async function createLocalSubmission(
  input: SubmissionInput,
  existingId?: string | null,
  files: PhotoFiles = { ganapati: [], decoration: [] },
) {
  const result = evaluateGanapatiSubmission(verificationInput(input));
  // Incomplete submissions can be reviewed, but an approved public listing needs
  // an exact point. The form keeps its state and asks for that point first.
  if (result.status === "approved" && !isValidCoordinates(input.coordinates))
    throw new Error("Choose an exact location on the map.");
  // Commit blobs before publishing their reference. A photo storage failure
  // leaves the form and the existing listing untouched for retry.
  const photoSetId = await storePhotoSet(photosFromFiles(files));
  const records = parseSubmissions(getSubmissionsSnapshot());
  const prior = records.find(
    (record) =>
      record.id === existingId && record.verificationStatus === "rejected",
  );
  const submission: Submission = {
    ...input,
    contact: normalizeIndianPhone(input.contact),
    id: prior?.id ?? "local-" + crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    score: result.totalScore,
    verificationStatus: result.status,
    category: result.status === "approved" ? "community" : null,
    photoSetId,
  };
  const persisted = writeStorage(
    storageKeys.submissions,
    JSON.stringify([
      ...records.filter((record) => record.id !== submission.id),
      submission,
    ]),
  );
  if (persisted && prior?.photoSetId)
    void discardPhotoSet(prior.photoSetId).catch(() => {});
  return { submission, persisted };
}

export async function updateLocalSubmissionPhotos(
  id: string,
  files: Partial<PhotoFiles>,
) {
  const prior = parseSubmissions(getSubmissionsSnapshot()).find(
    (item) => item.id === id,
  );
  if (!prior)
    throw new Error("This listing is no longer available in this browser.");
  const current =
    files.ganapati && files.decoration
      ? EMPTY_PHOTOS
      : ((await readPhotoSet(prior.photoSetId)) ?? EMPTY_PHOTOS);
  const additions = photosFromFiles({
    ganapati: files.ganapati ?? [],
    decoration: files.decoration ?? [],
  });
  const photos = {
    ganapati: files.ganapati ? additions.ganapati : current.ganapati,
    decoration: files.decoration ? additions.decoration : current.decoration,
  };
  const photoSetId = await storePhotoSet(photos);
  const records = parseSubmissions(getSubmissionsSnapshot());
  const latest = records.find((item) => item.id === id);
  if (!latest || latest.photoSetId !== prior.photoSetId) {
    void discardPhotoSet(photoSetId).catch(() => {});
    throw new Error(
      "This listing’s photos changed in another tab. Reopen it before saving again.",
    );
  }
  const metadata = (group: StoredPhoto[]) => ({
    names: group.map((photo) => photo.name),
    count: group.length,
  });
  const updated = {
    ...latest,
    photoSetId,
    ganapatiImages: files.ganapati
      ? metadata(photos.ganapati)
      : latest.ganapatiImages,
    decorationImages: files.decoration
      ? metadata(photos.decoration)
      : latest.decorationImages,
  };
  updated.score = evaluateGanapatiSubmission(
    verificationInput(updated),
  ).totalScore;
  // Preserve the ID, approval/category and all other details; photo edits never
  // publish a pending/private listing or create a duplicate.
  const persisted = writeStorage(
    storageKeys.submissions,
    JSON.stringify(records.map((item) => (item.id === id ? updated : item))),
  );
  if (persisted) void discardPhotoSet(prior.photoSetId).catch(() => {});
  return { persisted };
}

// STAGE 3: Protect Admin using Supabase authentication, roles and Row Level
// Security/server-side authorization. Browser-local review is not secure.
export function reviewLocalSubmission(
  id: string,
  category: PandalCategory | "reject",
) {
  const records = parseSubmissions(getSubmissionsSnapshot());
  const target = records.find((record) => record.id === id);
  if (!target || target.verificationStatus !== "manual_review")
    return {
      updated: false,
      persisted: false,
      reason: "This request is no longer pending.",
    };
  if (
    category !== "reject" &&
    (!target.publicAccess || !isValidCoordinates(target.coordinates))
  )
    return {
      updated: false,
      persisted: false,
      reason: "Approval requires public access and an exact map location.",
    };
  const updated = records.map((record) =>
    record.id === id
      ? {
          ...record,
          verificationStatus:
            category === "reject"
              ? ("rejected" as const)
              : ("approved" as const),
          category: category === "reject" ? null : category,
        }
      : record,
  );
  return {
    updated: true,
    persisted: writeStorage(storageKeys.submissions, JSON.stringify(updated)),
  };
}
export function getPublicPandals(submissions: Submission[]): Pandal[] {
  const approved = submissions.filter(
    (item): item is Submission & { coordinates: Pandal["coordinates"] } =>
      item.verificationStatus === "approved" &&
      item.publicAccess === true &&
      isValidCoordinates(item.coordinates),
  );
  return [
    ...approved.map((item): Pandal => ({
      id: item.id,
      name: item.mandalName.trim() || "Community Ganapati",
      area: item.locationText || "Map-selected location",
      description:
        "A public Ganapati celebration shared by its local community.",
      theme:
        "Ganapati and decoration photos are shared by this pandal’s local community.",
      image: "/illustrations/pandal.svg",
      gallery: ["/illustrations/decoration.svg"],
      verified: true,
      coordinates: item.coordinates,
      category: item.category ?? "community",
      photoSetId: item.photoSetId,
    })),
  ];
}
