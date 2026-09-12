import { readStorage, writeStorage, storageKeys } from "./demo-storage";
import { isValidCoordinates } from "./geo";
import { normalizeIndianPhone } from "./submission-eligibility";
import { evaluateGanapatiSubmission } from "./submission-verification";
import type {
  Pandal,
  PandalCategory,
  PhotoMetadata,
  Submission,
} from "./types";

export type SubmissionInput = Omit<
  Submission,
  "id" | "submittedAt" | "score" | "verificationStatus" | "category"
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
export function createLocalSubmission(
  input: SubmissionInput,
  existingId?: string | null,
) {
  const result = evaluateGanapatiSubmission(verificationInput(input));
  // Incomplete submissions can be reviewed, but an approved public listing needs
  // an exact point. The form keeps its state and asks for that point first.
  if (result.status === "approved" && !isValidCoordinates(input.coordinates))
    throw new Error("Choose an exact location on the map.");
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
  };
  const persisted = writeStorage(
    storageKeys.submissions,
    JSON.stringify([
      ...records.filter((record) => record.id !== submission.id),
      submission,
    ]),
  );
  return { submission, persisted };
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
export function combinePublicPandals(
  mockPandals: Pandal[],
  submissions: Submission[],
): Pandal[] {
  const approved = submissions.filter(
    (item): item is Submission & { coordinates: Pandal["coordinates"] } =>
      item.verificationStatus === "approved" &&
      item.publicAccess === true &&
      isValidCoordinates(item.coordinates),
  );
  return [
    ...mockPandals,
    ...approved.map((item): Pandal => ({
      id: item.id,
      name: item.mandalName.trim() || "Community Ganapati",
      area: item.locationText || "Map-selected location",
      description:
        "A public Ganapati celebration approved in this browser’s local simulation.",
      theme:
        "Community-submitted pandal. Photos will be available when image storage is connected.",
      image: "/illustrations/pandal.svg",
      gallery: ["/illustrations/decoration.svg"],
      verified: true,
      coordinates: item.coordinates,
      category: item.category ?? "community",
    })),
  ];
}
