export type Coordinates = { lat: number; lng: number };
export type PandalCategory = "featured" | "community";

export type Pandal = {
  id: string;
  name: string;
  area: string;
  description: string;
  theme: string;
  image: string;
  gallery: string[];
  verified: boolean;
  coordinates: Coordinates;
  category?: PandalCategory;
  distanceKm?: number;
  // Retained only for the unused Stage 1 MapMock reference component.
  mapPosition?: { top: string; left: string };
};

export type DemoUser = { name: string; email: string };
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
  score: number;
  verificationStatus: SubmissionStatus;
  category: PandalCategory | null;
};
