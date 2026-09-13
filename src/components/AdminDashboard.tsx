"use client";
import { ListingPhoto } from "./ListingPhoto";

import { StoredSubmissionPhotos } from "./StoredSubmissionPhotos";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  ImageIcon,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAdminSubmissions } from "@/hooks/useAdminSubmissions";
import { createClient } from "@/lib/supabase/client";
import { announcePandalChange } from "./PandalDataProvider";

import {
  CRITERIA,
  MAX_SUBMISSION_SCORE,
  evaluateGanapatiSubmission,
} from "@/lib/submission-verification";
import type { PandalCategory, Submission, SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Modal } from "./ui/Modal";
import { useFeedback } from "./ui/Feedback";
import { CategoryBadge } from "./CategoryBadge";

const statuses: Record<SubmissionStatus, string> = {
  manual_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function AdminDashboard() {
  const { requests, totalUsers, error, ready, refresh } = useAdminSubmissions();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<SubmissionStatus>("manual_review");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [returnFocusId, setReturnFocusId] = useState("admin-tab-manual_review");
  const review = requests.find((request) => request.id === reviewId) ?? null;
  const notify = useFeedback();
  const counts = {
    manual_review: requests.filter(
      (request) => request.verificationStatus === "manual_review",
    ).length,
    approved: requests.filter(
      (request) => request.verificationStatus === "approved",
    ).length,
    rejected: requests.filter(
      (request) => request.verificationStatus === "rejected",
    ).length,
  };
  async function update(id: string, category: PandalCategory | "reject") {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const { error } = await createClient().rpc("review_pandal_submission", { p_submission_id: id, p_decision: category, p_notes: id === reviewId ? notes || undefined : undefined });
      if (error) throw new Error(error.code === "42501" ? "Administrator access is required. Reload to check your account." : "The review could not be saved. Please retry.");
      setReturnFocusId(`admin-tab-${tab}`); setReviewId(null); setNotes("");
      announcePandalChange();
      notify(category === "reject" ? "Submission rejected and removed from public listings." : "Submission approved. Public celebrations are now published.", "success");
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Please retry the review.", "info"); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!ready) return <p role="status">Loading the review dashboard…</p>;
  if (error) return <div className="data-feedback" role="alert"><p>{error}</p><button className="button button-secondary" type="button" onClick={refresh}>Retry</button></div>;
  return (
    <>
      <div className="page-heading admin-heading">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={15} />
            Behind every great celebration
          </p>
          <h1>GnM Admin</h1>
          <p>A thoughtful look at the pandals joining our community.</p>
        </div>
        <Link href="/add" className="button button-secondary button-small">
          Share a Ganapati
        </Link>
      </div>
      <div className="admin-preview-note">
        <span className="tiny-dot" />
        Reviews update the shared listings. Private celebrations remain off the public map.
      </div>
      <div className="admin-stats">
        {[
          {
            label: "Pending Review",
            count: counts.manual_review,
            icon: Clock3,
            color: "orange",
          },
          {
            label: "Approved Pandals",
            count: counts.approved,
            icon: CheckCircle2,
            color: "green",
          },
          {
            label: "Rejected",
            count: counts.rejected,
            icon: XCircle,
            color: "red",
          },
          {
            label: "Total Users",
            count: totalUsers,
            icon: Users,
            color: "neutral",
          },
        ].map(({ label, count, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <div>
              <p>{label}</p>
              <strong>{count}</strong>
            </div>
            <span className={cn("stat-icon", color)}>
              <Icon size={23} />
            </span>
          </div>
        ))}
      </div>
      <div className="admin-list-heading">
        <h2>Submission requests</h2>
        <div className="admin-tabs" role="group" aria-label="Request status">
          {(Object.keys(statuses) as SubmissionStatus[]).map((status) => (
            <button
              type="button"
              id={`admin-tab-${status}`}
              key={status}
              aria-pressed={tab === status}
              onClick={() => setTab(status)}
            >
              {statuses[status]}
              <span>{counts[status]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="admin-request-list">
        {requests
          .filter((request) => request.verificationStatus === tab)
          .map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-photos">
                <div>
                  <ListingPhoto
                    paths={request.photos}
                    name={request.mandalName}
                    sizes="180px"
                  />
                </div>
                <div>
                  <ListingPhoto
                    paths={request.photos}
                    name={request.mandalName}
                    kind="decoration"
                    sizes="100px"
                  />
                </div>
              </div>
              <div className="request-info">
                <div className="request-title">
                  <h3>{request.mandalName || "Untitled submission"}</h3>
                  <span
                    className={cn(
                      "status-badge",
                      request.verificationStatus === "manual_review"
                        ? "pending"
                        : request.verificationStatus,
                    )}
                  >
                    {request.verificationStatus === "rejected"
                      ? "Not Eligible"
                      : statuses[request.verificationStatus]}
                  </span>
                </div>
                {request.category && (
                  <CategoryBadge category={request.category} />
                )}
                <p className="request-submitter">
                  {request.submitterName || "Name not provided"}
                  <span>·</span>
                  {request.submitterRole || "Role not provided"}
                </p>
                <p className="request-score">
                  Eligibility score: {request.score} / {MAX_SUBMISSION_SCORE}
                  {request.possibleDuplicate && <strong> · Possible duplicate — review the name and location</strong>}
                </p>
                <div className="request-facts">
                  <span>
                    <MapPin size={15} />
                    {request.locationText ||
                      (request.coordinates
                        ? "Map-selected location"
                        : "Location not provided")}
                  </span>
                  <span className="coordinates-value">
                    {formatCoordinates(request.coordinates)}
                  </span>
                  <span>
                    <Phone size={15} />
                    {request.contact || "Contact not provided"}
                  </span>
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(request.submittedAt)}
                  </span>
                  <span>
                    <Users size={15} />
                    Public Access: {request.publicAccess ? "Yes" : "No"}
                  </span>
                  <span>
                    <ImageIcon size={15} />
                    {request.ganapatiImages.count} Ganapati ·{" "}
                    {request.decorationImages.count} decoration photos
                  </span>
                </div>
                <div className="request-actions">
                  <ApprovalActions request={request} onAction={update} disabled={busy} />
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    id={`review-${request.id}`}
                    aria-label={`Review ${request.mandalName || "Untitled submission"}`}
                    onClick={() => {
                      setReturnFocusId(`review-${request.id}`);
                      setReviewId(request.id);
                      setNotes(request.reviewNotes || "");
                    }}
                  >
                    <Eye size={17} />
                    Review
                  </button>
                </div>
              </div>
            </article>
          ))}
        {!counts[tab] && (
          <div className="admin-empty">
            <CheckCircle2 size={34} />
            <h3>
              {tab === "manual_review"
                ? "All caught up."
                : `No ${statuses[tab].toLowerCase()} requests yet.`}
            </h3>
            <p>Submitted Ganapatis and your review decisions will appear here.</p>
            <Link href="/add" className="text-link">
              Share a Ganapati
            </Link>
          </div>
        )}
      </div>
      <Modal
        open={!!review}
        onClose={() => setReviewId(null)}
        title={review?.mandalName || "Untitled submission"}
        description="Review public access, exact coordinates, submitter details and saved photos."
        className="review-modal"
        returnFocusId={returnFocusId}
      >
        {review && (
          <>
            <span className="eyebrow">Submission review</span>
            <h2>{review.mandalName || "Untitled submission"}</h2>
            <dl className="review-details">
              {[
                ["Submitter", review.submitterName],
                ["Role", review.submitterRole],
                ["Contact", review.contact],
                [
                  "Location",
                  review.locationText ||
                    (review.coordinates
                      ? "Map-selected location"
                      : "Location not provided"),
                ],
                ["Coordinates", formatCoordinates(review.coordinates)],
                ["Public Access", review.publicAccess ? "Yes" : "No"],
                ["Submitted", formatDate(review.submittedAt)],
                [
                  "Status",
                  review.verificationStatus === "rejected"
                    ? "Not Eligible"
                    : statuses[review.verificationStatus],
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <ScoreBreakdown submission={review} />
            <StoredSubmissionPhotos
              key={`review-photos-${review.id}`}
              paths={review.photos}
              name={review.mandalName}
            />
            <label className="field-label" htmlFor="review-notes">Internal review notes</label>
            <textarea id="review-notes" className="input" maxLength={2000} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} />
            {review.category && <CategoryBadge category={review.category} />}
            <div className="request-actions"><ApprovalActions request={review} onAction={update} disabled={busy} /></div>
          </>
        )}
      </Modal>
    </>
  );
}

function ApprovalActions({
  request,
  onAction,
  disabled,
}: {
  request: Submission;
  disabled: boolean;
  onAction: (id: string, category: PandalCategory | "reject") => void;
}) {
  return (
    <>
      <button
        type="button"
        className="button button-primary button-small"
        aria-label={`Approve ${request.mandalName || "Untitled submission"} as Featured`}
        disabled={disabled}
        onClick={() => onAction(request.id, "featured")}
      >
        <Sparkles size={16} />
        Approve as Featured
      </button>
      <button
        type="button"
        className="button button-secondary button-small"
        aria-label={`Approve ${request.mandalName || "Untitled submission"} as Community`}
        disabled={disabled}
        onClick={() => onAction(request.id, "community")}
      >
        <Check size={17} />
        Approve as Community
      </button>
      <button
        type="button"
        className="button button-secondary button-small reject-button"
        aria-label={`Reject ${request.mandalName || "Untitled submission"}`}
        disabled={disabled}
        onClick={() => onAction(request.id, "reject")}
      >
        <X size={17} />
        Reject
      </button>
    </>
  );
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatCoordinates(point: Submission["coordinates"]) {
  return point
    ? point.lat.toFixed(6) + ", " + point.lng.toFixed(6)
    : "Not provided";
}
function ScoreBreakdown({ submission }: { submission: Submission }) {
  const result = evaluateGanapatiSubmission({
    mandalName: submission.mandalName, coordinates: submission.coordinates, submitterName: submission.submitterName,
    submitterRole: submission.submitterRole, contact: submission.contact, publicAccess: submission.publicAccess,
    ganapatiPhotoCount: submission.ganapatiImages.count, decorationPhotoCount: submission.decorationImages.count,
  });
  return (
    <section className="review-score-breakdown">
      <h3>
        Eligibility Score: {submission.score} / {MAX_SUBMISSION_SCORE}
      </h3>
      <dl>
        {(Object.keys(CRITERIA) as (keyof typeof CRITERIA)[]).map((key) => (
          <div key={key}>
            <dt>{CRITERIA[key].label}</dt>
            <dd>
              {result.criteria[key].points} / {CRITERIA[key].maximum}
            </dd>
          </div>
        ))}
      </dl>
      {result.reasons.length > 0 && (
        <ul>
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {(!submission.publicAccess || !submission.coordinates) && (
        <p>Public approval needs public access and an exact map point.</p>
      )}
    </section>
  );
}
