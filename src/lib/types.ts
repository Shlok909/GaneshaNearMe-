export type Coordinates = { lat: number; lng: number };
export type PhotoKind = "ganapati" | "decoration";
export type PhotoPaths = { ganapati: string[]; decoration: string[] };
export type PandalCategory = "featured" | "community";

export type Pandal = {
  id: string;
  name: string;
  area: string;
  description: string;
  theme: string;
  image: string;
  gallery: string[];
  photos?: PhotoPaths;
  verified: boolean;
  coordinates: Coordinates;
  category?: PandalCategory;
  distanceKm?: number;
};

export type SubmissionStatus = "manual_review" | "approved" | "rejected";
export type SubmitterRole = "Mandal Organizer" | "Volunteer";
export type PhotoMetadata = { names: string[]; count: number };
export type Submission = {
  id: string;
  mandalName: string;
  locationText: string;
  coordinates: Coordinates | null;
  submitterName: string;
  submitterRole: string;
  contact: string;
  publicAccess: boolean;
  ganapatiImages: PhotoMetadata;
  decorationImages: PhotoMetadata;
  submittedAt: string;
  photos?: PhotoPaths;
  possibleDuplicate?: boolean;
  reviewNotes?: string | null;
  score: number;
  verificationStatus: SubmissionStatus;
  category: PandalCategory | null;
};
