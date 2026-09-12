"use client";

import { useEffect, useRef } from "react";

export function UserLocationMarker({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: () => void;
}) {
  const marker = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = marker.current;
    const ring = element?.querySelector<HTMLElement>(".location-ring");
    if (!element || !ring) return;
    let inView = true;
    const updateAnimation = () => {
      ring.style.animationPlayState =
        inView && !document.hidden ? "running" : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimation();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", updateAnimation);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateAnimation);
    };
  }, []);
  return (
    <button
      ref={marker}
      type="button"
      id="your-location"
      className="user-location"
      style={{ top: "52%", left: "43%" }}
      aria-label="Your location"
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="location-ring" />
      <span className="location-dot" />
      {selected && <span className="user-location-label">Your location</span>}
    </button>
  );
}
