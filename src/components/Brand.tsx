import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <span className={cn("app-logo size-8", className)} aria-hidden="true">
      <Image
        src="/logoofapp.png"
        alt=""
        width={96}
        height={96}
        className="app-logo-image"
      />
    </span>
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
        <AppLogo className="size-full" />
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
