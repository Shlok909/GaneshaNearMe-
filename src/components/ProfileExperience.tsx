"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Heart,
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";
import { useDemoUser, useSavedPandals } from "@/lib/hooks";
import { signOutDemo } from "@/lib/demo-auth";

export function ProfileExperience() {
  const user = useDemoUser();
  const { ids } = useSavedPandals();
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="profile-container">
      <div className="page-heading">
        <p className="eyebrow">Your corner of the celebration</p>
        <h1>My profile</h1>
      </div>
      <section className="profile-card">
        <div className="profile-cover">
          <span>गणपती बाप्पा मोरया</span>
        </div>
        <div className="profile-identity">
          <div className="profile-avatar">{initials}</div>
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
            <p>
              Submissions are saved in this browser for local review.
              Account-linked submission history will be available in a later
              stage.
            </p>
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
              This preview uses demo listings on a real map. Location is
              optional and stays in memory. Saved places and submission metadata
              stay in this browser; local approval makes a submission visible
              here.
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
            onClick={() => {
              signOutDemo();
              router.push("/auth");
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </section>
      <p className="profile-footer">GaneshaNearMe · Made with devotion</p>
    </div>
  );
}
