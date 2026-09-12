import Link from "next/link";
import { cn } from "@/lib/utils";

export function ModakIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <path
        d="M24 4C21 14 7 22 7 33c0 12 34 12 34 0C41 22 27 14 24 4Z"
        fill="currentColor"
      />
      <path
        d="M24 10c-7 12-9 18-9 29m9-29c7 12 9 18 9 29M24 11v30"
        stroke="white"
        strokeOpacity=".55"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({
  full = false,
  href = "/home",
  light = false,
}: {
  full?: boolean;
  href?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("brand", light && "brand-light")}
      aria-label="GaneshaNearMe home"
    >
      <span className="brand-symbol">
        <ModakIcon />
      </span>
      <span>
        <span className="brand-name">
          GnM<span className="brand-dot">.</span>
        </span>
        {full && <span className="brand-caption">GaneshaNearMe</span>}
      </span>
    </Link>
  );
}
