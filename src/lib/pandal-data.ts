import type { Tables } from "./supabase/database.types";
import type { Pandal, Submission } from "./types";

type PublicRow = Omit<Tables<"pandals">, "location"> & { distance_meters?: number };
export function toPandal(row: PublicRow): Pandal {
  return {
    id: row.id, name: row.mandal_name, area: row.area || "Map-selected location",
    description: row.description || "A public Ganapati celebration shared by its community.",
    theme: row.theme || "Visit this community's Ganapati and celebration.",
    image: "/illustrations/pandal.svg", gallery: [],
    photos: { ganapati: row.ganapati_image_paths, decoration: row.pandal_image_paths },
    coordinates: { lat: row.latitude, lng: row.longitude }, verified: true,
    category: row.category === "featured" ? "featured" : "community",
    ...(row.distance_meters !== undefined ? { distanceKm: row.distance_meters / 1000 } : {}),
  };
}
export function toSubmission(row: Tables<"pandal_submissions">): Submission {
  return {
    id: row.id, mandalName: row.mandal_name, locationText: row.location_text || row.area,
    coordinates: { lat: row.latitude, lng: row.longitude }, submitterName: row.submitter_name,
    submitterRole: row.submitter_role === "organizer" ? "Mandal Organizer" : row.submitter_role === "volunteer" ? "Volunteer" : "",
    contact: row.contact_phone, publicAccess: row.public_access,
    ganapatiImages: { names: row.ganapati_image_paths, count: row.ganapati_image_paths.length },
    decorationImages: { names: row.pandal_image_paths, count: row.pandal_image_paths.length },
    photos: { ganapati: row.ganapati_image_paths, decoration: row.pandal_image_paths },
    score: row.verification_score, submittedAt: row.submitted_at || row.created_at,
    verificationStatus: row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : "manual_review",
    category: row.category === "featured" || row.category === "community" ? row.category : null,
    possibleDuplicate: row.possible_duplicate, reviewNotes: row.review_notes,
  };
}

// Page through the API limit instead of silently hiding records after the first 1,000.
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error || !data) throw error || new Error("Data unavailable");
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
