"use client";

import type { LocationState } from "@/hooks/useUserLocation";

export function LocationFeedback({
  location,
  onRetry,
  onCancel,
}: {
  location: LocationState;
  onRetry: () => void;
  onCancel: () => void;
}) {
  if (!location.message) return null;
  const requesting = location.status === "requesting";
  const active = location.status === "active";
  return (
    <div
      className={`location-feedback${active ? " location-feedback-active" : ""}`}
    >
      <div className="location-notice" role="status">
        <span>{location.message}</span>
        {!active && (
          <button type="button" onClick={requesting ? onCancel : onRetry}>
            {requesting ? "Cancel" : "Try Again"}
          </button>
        )}
      </div>
      {!active && (
        <details className="location-help">
          <summary>Help with location access</summary>
          <p>
            Allow location in your browser’s site permissions and turn on your
            device’s location services.
          </p>
          <p>
            On Windows: Settings → Privacy &amp; security → Location. Enable
            location services and access for apps or desktop apps where
            available.
          </p>
          <p>
            If an in-app preview cannot find your position, open this same page
            directly in Chrome, Edge or Safari and allow location there.
          </p>
        </details>
      )}
    </div>
  );
}
