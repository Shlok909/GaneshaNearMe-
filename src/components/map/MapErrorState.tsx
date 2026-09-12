import { MapPinOff, RotateCcw } from "lucide-react";

export function MapErrorState({
  onRetry,
  missing = false,
}: {
  onRetry: () => void;
  missing?: boolean;
}) {
  return (
    <div className="map-error-state" role="status">
      <MapPinOff size={27} />
      <h3>
        {missing
          ? "Google Maps configuration is missing."
          : "Map could not be loaded."}
      </h3>
      <p>
        {missing
          ? "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAP_ID in .env.local, then restart the app."
          : "You can still browse listings. Check your connection and Google Maps configuration, then try again."}
      </p>
      <button
        type="button"
        className="button button-secondary button-small"
        onClick={onRetry}
      >
        <RotateCcw size={16} />
        Try Again
      </button>
    </div>
  );
}
