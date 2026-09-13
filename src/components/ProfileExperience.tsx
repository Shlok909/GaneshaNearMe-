"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Heart,
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";
import { useSavedPandals } from "@/lib/hooks";
import type { ProfileUser } from "@/lib/auth/user";
import { logout, updateProfile } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { validateName } from "@/lib/auth/validation";
import { MySubmissions } from "./MySubmissions";

export function ProfileExperience({ user, isAdmin, profileError }: { user: ProfileUser; isAdmin: boolean; profileError: string }) {
  const { ids } = useSavedPandals();
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState<"profile" | "logout" | null>(null);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const validationError = validateName(String(data.get("name") ?? ""));
    setError(validationError);
    setSuccess(false);
    if (validationError) return;
    pending.current = true;
    setBusy("profile");
    try {
      const result = await updateProfile(data);
      if (result.error) setError(result.error);
      else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy("logout");
    setError(undefined);
    setSuccess(false);
    try {
      const result = await logout();
      if (result.error) setError(result.error);
      else {
        // Server revoked the session and cleared cookies; notify the SDK's
        // other tabs too. Supabase owns this broadcast and persistence.
        await createClient().auth.signOut({ scope: "local" });
        window.location.replace("/auth");
      }
    } catch {
      setError("We couldn't sign you out right now. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  return (
    <div className="profile-container">
      <div className="page-heading">
        <p className="eyebrow">Your corner of the celebration</p>
        <h1>My profile</h1>
      </div>
      <section className="profile-card">
        {profileError && <div className="data-feedback" role="alert"><p>{profileError}</p><button type="button" className="text-link" onClick={() => router.refresh()}>Retry profile</button></div>}
        <div className="profile-cover">
          <span>गणपती बाप्पा मोरया</span>
        </div>
        <div className="profile-identity">
          <div className="profile-avatar">{user.initials}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="profile-tag">
            <Heart size={13} /> A fellow Bappa explorer
          </span>
        </div>
        <div className="profile-section">
          <h3>Account Details</h3>
          <div className="account-detail">
            <UserRound size={19} />
            <span>
              Name<strong>{user.name}</strong>
            </span>
          </div>
          <div className="account-detail">
            <Mail size={19} />
            <span>
              Email<strong>{user.email}</strong>
            </span>
          </div>
          <div className="account-detail">
            <CalendarDays size={19} />
            <span>
              Member since<strong>{user.memberSince}</strong>
            </span>
          </div>
          <form onSubmit={saveProfile} className="profile-edit-form">
            <label className="field-label" htmlFor="profile-name">
              Full Name
            </label>
            <input
              id="profile-name"
              className="input"
              name="name"
              defaultValue={user.name}
              key={user.name}
              maxLength={80}
              autoComplete="name"
              required
              disabled={!!busy}
              aria-describedby={error ? "profile-feedback" : undefined}
            />
            <button
              className="button button-secondary"
              type="submit"
              disabled={!!busy}
            >
              {busy === "profile" ? "Saving…" : "Save Changes"}
            </button>
          </form>
          {error && (
            <p
              id="profile-feedback"
              role="alert"
              className="field-error auth-message"
            >
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="profile-success">
              Profile updated
            </p>
          )}
        </div>
        <Link href="/saved" className="profile-row">
          <span className="profile-row-icon">
            <Bookmark size={20} />
          </span>
          <span>
            Saved Ganapatis<small>Your next darshan, all in one place</small>
          </span>
          <strong className="profile-count">{ids.length}</strong>
          <ChevronRight size={18} />
        </Link>
        {isAdmin && <Link href="/admin" className="profile-row"><span className="profile-row-icon"><ClipboardList size={20} /></span><span>GnM Admin<small>Review submissions and manage listings</small></span><ChevronRight size={18} /></Link>}
        <details className="profile-details">
          <summary className="profile-row">
            <span className="profile-row-icon">
              <ClipboardList size={20} />
            </span>
            <span>
              My Submissions<small>The celebrations you’ve shared</small>
            </span>
            <ChevronDown size={18} />
          </summary>
          <div className="profile-details-content">
            <MySubmissions />
            <Link href="/add" className="text-link">
              Share your Ganapati
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </details>
        <details className="profile-details">
          <summary className="profile-row">
            <span className="profile-row-icon">
              <CircleHelp size={20} />
            </span>
            <span>
              Help / About<small>A little more about GaneshaNearMe</small>
            </span>
            <ChevronDown size={18} />
          </summary>
          <div className="profile-details-content">
            <p>
              GaneshaNearMe brings the joy of discovering public Ganapati
              pandals to your neighbourhood. Search an area, tap a modak, then
              save or share a place you love.
            </p>
            <p>
              This app shows approved public Ganapatis. Your saves and submissions
              are linked to your account. Your current location is optional and
              stays in memory; only a location you choose for a submission is saved.
            </p>
            <Link href="/" className="text-link">
              About GaneshaNearMe
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </details>
        <div className="profile-logout">
          <button
            type="button"
            className="button logout-button"
            disabled={!!busy}
            onClick={signOut}
          >
            <LogOut size={18} />
            {busy === "logout" ? "Signing out…" : "Logout"}
          </button>
        </div>
      </section>
      <p className="profile-footer">GaneshaNearMe · Made with devotion</p>
    </div>
  );
}
