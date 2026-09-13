"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Brand } from "./Brand";

const team = [
  ["Founder & CEO", "Shlok Sane"],
  ["Co-Founder & CFO", "Vijay Bhoyar"],
  ["Technical Help", "Mahesh Raut"],
] as const;

export function AboutDialog() {
  const [open, setOpen] = useState(false);
  return <>
    <button id="about-gnm-button" type="button" className="about-button" aria-label="About GaneshaNearMe" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Info size={19} aria-hidden="true" /><span>About</span>
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="About GaneshaNearMe" description="Meet the people behind GaneshaNearMe." className="about-modal" returnFocusId="about-gnm-button" closeLabel="Close About">
      <div className="about-intro">
        <Brand />
        <p className="about-eyebrow">THE PEOPLE BEHIND GnM</p>
        <h2>A little closer to Bappa.</h2>
        <p>Helping our community find Ganapati celebrations and plan their next darshan.</p>
      </div>
      <dl className="about-team">
        {team.map(([role, name]) => <div key={role}><dt>{role}</dt><dd>{name}</dd></div>)}
      </dl>
      <p className="about-footer">Made with devotion, for the community.</p>
    </Modal>
  </>;
}
