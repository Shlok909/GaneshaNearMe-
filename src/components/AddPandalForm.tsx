"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Flower2,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  getSubmissionFieldErrors,
  PUBLIC_ACCESS_MESSAGE,
} from "@/lib/submission-eligibility";
import { submitPandal, type DraftAttempt } from "@/lib/submit-pandal";
import { normalizeIndianPhone } from "@/lib/submission-eligibility";
import { announcePandalChange, usePandalData } from "./PandalDataProvider";
import { parseCoordinates } from "@/lib/maps-links";
import type { Coordinates, SubmissionStatus } from "@/lib/types";

import { LocationPickerField } from "./LocationPickerField";

import { ImagePicker } from "./ImagePicker";
import { AppLogo } from "./Brand";

export function AddPandalForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ganapatiPhotos, setGanapatiPhotos] = useState(0);
  const [decorationPhotos, setDecorationPhotos] = useState(0);
  const [submitted, setSubmitted] = useState<SubmissionStatus | null>(null);
  const attempt = useRef<DraftAttempt | null>(null);
  const [draftLocked, setDraftLocked] = useState(false);
  const [published, setPublished] = useState(false);
  const [progress, setProgress] = useState("");
  const { userId } = usePandalData();
  const [locationText, setLocationText] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [coordinateSource, setCoordinateSource] = useState<
    "map" | "text" | null
  >(null);
  const [parseMessage, setParseMessage] = useState("");
  const [publicAccess, setPublicAccess] = useState("");
  const [ganapatiFiles, setGanapatiFiles] = useState<File[]>([]);
  const [decorationFiles, setDecorationFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savingRef = useRef(false);

  function updateLocationText(text: string) {
    setLocationText(text);
    const parsed = parseCoordinates(text);
    if (parsed) {
      setCoordinates(parsed);
      setCoordinateSource("text");
      setParseMessage("");
      clearError("coordinates");
    } else {
      if (coordinateSource === "text") {
        setCoordinates(null);
        setCoordinateSource(null);
      }
      setParseMessage(
        /https?:\/\/|maps\.app|google\.|^-?\d/.test(text)
          ? "We couldn't detect exact coordinates from this link. Please choose the location on the map."
          : "",
      );
    }
  }
  function clearError(name: string) {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const data = new FormData(event.currentTarget);
    const frozen = attempt.current?.details;
    const original: Record<string, unknown> = frozen ? {
      mandalName: frozen.mandal_name, name: frozen.submitter_name,
      role: frozen.submitter_role === "volunteer" ? "Volunteer" : "Mandal Organizer",
      phone: frozen.contact_phone, isPublic: frozen.public_access ? "yes" : "no",
      area: frozen.area, theme: frozen.theme, description: frozen.description,
    } : {};
    const value = (key: string) => String(frozen ? original[key] ?? "" : data.get(key) ?? "").trim();
    const details = {
      mandalName: value("mandalName"),
      coordinates,
      submitterName: value("name"),
      submitterRole: value("role"),
      contact: value("phone"),
      publicAccess: value("isPublic") === "yes",
      ganapatiPhotoCount: ganapatiPhotos,
      decorationPhotoCount: decorationPhotos,
    };
    const nextErrors = getSubmissionFieldErrors(details);
    if (!value("isPublic")) nextErrors.isPublic = "Please choose whether the celebration is public.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    setErrors({});
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    if (!attempt.current) {
      attempt.current = {
        id: crypto.randomUUID(), uploads: new Map(),
        details: {
          submitted_by: userId, mandal_name: details.mandalName, area: value("area"),
          location_text: locationText.trim(), latitude: coordinates!.lat, longitude: coordinates!.lng,
          submitter_name: details.submitterName, submitter_role: details.submitterRole === "Volunteer" ? "volunteer" : "organizer",
          contact_phone: normalizeIndianPhone(details.contact), public_access: details.publicAccess,
          theme: value("theme") || null, description: value("description") || null,
        },
      };
    }
    setDraftLocked(true);
    try {
      const result = await submitPandal(attempt.current, { ganapati: ganapatiFiles, decoration: decorationFiles }, setProgress);
      setSubmitted(result.submission_status as SubmissionStatus);
      setPublished(result.published);
      announcePandalChange();
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Photos could not be saved. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  if (submitted)
    return (
      <div className="submission-success" role="status">
        <div className="success-symbol">
          <AppLogo className="size-16" />
          <span>
            <Check size={20} />
          </span>
        </div>
        <p className="eyebrow">A little more joy for everyone</p>
        <h1>
          {submitted === "approved"
            ? "Your Ganapati submission has been approved."
            : submitted === "rejected" ? "We couldn’t accept this submission." : "Your Ganapati has been submitted for review."}
        </h1>
        <p>
          {published ? "Your public Ganapati is now available on the map." : submitted === "approved" ? "Your submission is approved. Private celebrations stay off the public map." : submitted === "rejected" ? "You can review your submission history on your profile and start a new submission with complete details." : "Our team will review the details before the listing can be published."}
        </p>
        <div className="success-note">
          <ClipboardCheck size={22} />
          <span>
            {publicAccess === "no"
              ? "Private celebrations will not appear on the public map."
              : "Your submission is saved to your account."}
          </span>
        </div>
        <Link href="/home" className="button button-primary">
          Back to exploring
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          <Flower2 size={15} />
          Let your neighbourhood shine
        </span>
        <h1>Share Your Ganapati</h1>
        <p>Tell us about your public Ganapati pandal.</p>
      </div>
      <div className="submission-layout">
        <form
          className="submission-form"
          onSubmit={submit}
          onChange={(event) => {
            if (event.target instanceof HTMLInputElement) {
              clearError(event.target.name);
              if (event.target.name === "isPublic")
                setPublicAccess(event.target.value);
            }
          }}
          noValidate
        >
          <fieldset disabled={saving}>
            <p className="form-required-note">
              Fields marked <span>*</span> are required.
            </p>
            <fieldset disabled={draftLocked}>
            <section className="form-section">
              <div className="form-section-heading">
                <span>01</span>
                <div>
                  <h2>About your mandal</h2>
                  <p>Help people find their way to Bappa.</p>
                </div>
              </div>
              <FormField
                id="mandalName"
                label="Mandal Name"
                placeholder="e.g. Shree Ganesh Utsav Mandal"
                error={errors.mandalName}
              />
              <FormField id="area" label="Area / Neighbourhood" placeholder="e.g. Dharampeth, Nagpur" maxLength={160} required={false} />
              <FormField id="theme" label="Theme" placeholder="What makes your celebration special?" maxLength={500} required={false} />
              <FormField id="description" label="Description" placeholder="A little about your Ganapati" maxLength={2000} required={false} />
              <FormField
                id="location"
                maxLength={1000}
                label="Exact Location"
                placeholder="Paste Google Maps link or type location"
                value={locationText}
                onChange={(event) => updateLocationText(event.target.value)}
                required={false}
                error={errors.location}
                icon={<MapPin size={18} />}
                hint="Paste a Maps link or add the area and a nearby landmark. Confirm the exact point below."
              />
              {parseMessage && (
                <p className="field-hint coordinate-parse-notice" role="status">
                  {parseMessage}
                </p>
              )}
              <LocationPickerField
                value={coordinates}
                onChange={(point) => {
                  setCoordinates(point);
                  setCoordinateSource("map");
                  setParseMessage("");
                  clearError("coordinates");
                }}
                error={errors.coordinates}
              />
            </section>
            <section className="form-section">
              <div className="form-section-heading">
                <span>02</span>
                <div>
                  <h2>Who are you?</h2>
                  <p>A familiar face behind the celebration.</p>
                </div>
              </div>
              <FormField
                id="name"
                label="Your Name"
                placeholder="Your full name"
                autoComplete="name"
                error={errors.name}
              />
              <fieldset className="field">
                <legend className="field-label">
                  Your role<span className="required-mark"> *</span>
                </legend>
                <div className="radio-grid">
                  <RadioCard
                    id="role"
                    name="role"
                    value="Mandal Organizer"
                    label="Mandal Organizer"
                    icon={<UsersRound size={20} />}
                    invalid={!!errors.role}
                  />
                  <RadioCard
                    name="role"
                    value="Volunteer"
                    label="Volunteer"
                    icon={<HeartHandshake size={20} />}
                    invalid={!!errors.role}
                  />
                </div>
                {errors.role && (
                  <p id="role-error" className="field-error">
                    {errors.role}
                  </p>
                )}
              </fieldset>
              <FormField
                id="phone"
                label="Organizer / Mandal Contact"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="e.g. 98765 43210"
                error={errors.phone}
                icon={<Phone size={17} />}
                hint="A mobile number for questions about your submission."
              />
            </section>
            </fieldset>
            <section className="form-section">
              <div className="form-section-heading">
                <span>03</span>
                <div>
                  <h2>A glimpse of the celebration</h2>
                  <p>Show us the idol and the space you’ve created.</p>
                </div>
              </div>
              <div className="upload-grid">
                <ImagePicker
                  id="ganapati-photos"
                  label="Ganapati Photos"
                  max={2}
                  onFilesChange={setGanapatiFiles}
                  error={errors["ganapati-photos"]}
                  onCountChange={(count) => {
                    setGanapatiPhotos(count);
                    if (count > 0) clearError("ganapati-photos");
                  }}
                />
                <ImagePicker
                  id="decoration-photos"
                  label="Pandal & Decoration Photos"
                  max={3}
                  onFilesChange={setDecorationFiles}
                  error={errors["decoration-photos"]}
                  onCountChange={(count) => {
                    setDecorationPhotos(count);
                    if (count > 0) clearError("decoration-photos");
                  }}
                />
              </div>
            </section>
            <section className="form-section last-section">
              <fieldset disabled={draftLocked}>
                <legend className="field-label public-question">
                  Is this open to the general public?
                  <span className="required-mark"> *</span>
                </legend>
                <div className="radio-grid">
                  <RadioCard
                    id="isPublic"
                    name="isPublic"
                    value="yes"
                    label="Yes, everyone is welcome"
                    invalid={!!errors.isPublic || publicAccess === "no"}
                  />
                  <RadioCard
                    name="isPublic"
                    value="no"
                    label="No, it’s a private celebration"
                    invalid={!!errors.isPublic || publicAccess === "no"}
                  />
                </div>
                {(errors.isPublic || publicAccess === "no") && (
                  <p id="isPublic-error" className="field-error">
                    {publicAccess === "no"
                      ? PUBLIC_ACCESS_MESSAGE
                      : errors.isPublic}
                  </p>
                )}
              </fieldset>
            </section>
            {draftLocked && !saving && <p className="field-hint">Your draft details are locked. You can adjust the photos and retry this same submission.</p>}
            {saveError && (
              <p className="photo-save-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="submit-footer">
              <p>
                <ShieldCheck size={17} />
                Only public Ganapatis can appear on the map.
              </p>
              <button type="submit" className="button button-primary">
                {saving ? progress || "Saving…" : draftLocked ? "Retry submission" : "Submit Ganapati"}
                <ArrowRight size={18} />
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="submission-aside">
          <span className="aside-icon">
            <AppLogo className="size-10" />
          </span>
          <h2>
            Bring your Bappa
            <br />
            to the neighbourhood.
          </h2>
          <p>
            A few thoughtful details help fellow devotees discover your
            celebration.
          </p>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              Use your mandal’s full name.
            </li>
            <li>
              <CheckCircle2 size={18} />
              Add a clear location and landmark.
            </li>
            <li>
              <CheckCircle2 size={18} />
              Share well-lit, recent photos.
            </li>
            <li>
              <CheckCircle2 size={18} />
              Keep a contact person available.
            </li>
          </ul>
          <div className="aside-bottom">
            <HeartHandshake size={22} />
            <span>
              Built on community.
              <br />
              Guided by devotion.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function FormField({
  id,
  label,
  error,
  hint,
  icon,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {props.required !== false && <span className="required-mark"> *</span>}
      </label>
      <div className={icon ? "input-with-icon" : ""}>
        {icon}
        <input
          className={icon ? undefined : "input"}
          id={id}
          name={id}
          required
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function RadioCard({
  id,
  name,
  value,
  label,
  icon,
  invalid,
}: {
  id?: string;
  name: string;
  value: string;
  label: string;
  icon?: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <label className="radio-card">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        required
        aria-describedby={invalid ? `${name}-error` : undefined}
      />
      {icon}
      <span>{label}</span>
      <span className="radio-indicator">
        <Check size={12} />
      </span>
    </label>
  );
}
