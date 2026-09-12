import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span className="verified-badge">
      <BadgeCheck size={14} /> {label}
    </span>
  );
}
