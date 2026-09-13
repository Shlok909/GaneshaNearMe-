// Browser keys are visible by design. Restrict this key to your website referrers
// and its intended API in Google Cloud; never use it as a server secret.
export const DEFAULT_MAP_CENTER = { lat: 21.1458, lng: 79.0882 };
export const DEFAULT_MAP_ZOOM = 12;
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
export const GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim() ?? "";
export const HAS_GOOGLE_MAPS_CONFIG = Boolean(
  GOOGLE_MAPS_API_KEY && GOOGLE_MAP_ID,
);
