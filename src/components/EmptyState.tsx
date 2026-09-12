import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ModakIcon } from "./Brand";

export function EmptyState({
  title = "No Ganapatis saved yet.",
  description = "A little planning, a lot of Bappa. Save the pandals you’d love to visit and find them all here.",
  href = "/home",
  action = "Explore Ganapatis",
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <ModakIcon className="size-20" />
        <span className="empty-spark spark-one">✦</span>
        <span className="empty-spark spark-two">✧</span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href={href} className="button button-primary">
        {action}
        <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
