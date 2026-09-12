"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { updateLocalSubmissionPhotos } from "@/lib/demo-submissions";
import { ImagePicker } from "./ImagePicker";
import { useFeedback } from "./ui/Feedback";

export function ListingPhotoEditor({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="listing-photo-manager">
      {open ? (
        <PhotoForm listingId={listingId} onClose={() => setOpen(false)} />
      ) : (
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => setOpen(true)}
        >
          <ImagePlus size={17} />
          Add or update photos
        </button>
      )}
    </div>
  );
}

function PhotoForm({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const id = useId();
  const [ganapati, setGanapati] = useState<File[]>([]);
  const [decoration, setDecoration] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const notify = useFeedback();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    if (!ganapati.length && !decoration.length) {
      setError("Choose at least one photo to save.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await updateLocalSubmissionPhotos(listingId, {
        ...(ganapati.length ? { ganapati } : {}),
        ...(decoration.length ? { decoration } : {}),
      });
      notify(
        result.persisted
          ? "Photos saved in this browser."
          : "Updated for this visit only. Listing storage is unavailable.",
        result.persisted ? "success" : "info",
      );
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Photos could not be saved. Please try again.",
      );
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="listing-photo-editor"
      onSubmit={save}
      aria-label="Update listing photos"
      aria-busy={busy}
    >
      <h3>Add or update photos</h3>
      <p>
        Choose the original Ganapati and decoration images for this listing. New
        photos replace only the group you select; the other group stays
        unchanged.
      </p>
      <fieldset disabled={busy}>
        <ImagePicker
          id={`${id}-ganapati`}
          label="Ganapati Photos"
          max={2}
          onFilesChange={setGanapati}
          required={false}
        />
        <ImagePicker
          id={`${id}-decoration`}
          label="Decoration Photos"
          max={3}
          onFilesChange={setDecoration}
          required={false}
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="photo-editor-actions">
          <button type="submit" className="button button-primary button-small">
            {busy ? "Saving photos…" : "Save photos"}
          </button>
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
