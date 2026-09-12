"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link
        href="/home"
        className={cn("nav-item", path === "/home" && "active")}
        aria-current={path === "/home" ? "page" : undefined}
      >
        <Compass size={23} strokeWidth={1.8} />
        <span>Explore</span>
      </Link>
      <Link
        href="/add"
        className={cn("nav-add", path === "/add" && "active")}
        aria-label="Share your Ganapati"
        aria-current={path === "/add" ? "page" : undefined}
      >
        <span>
          <Plus size={29} strokeWidth={1.8} />
        </span>
        <span className="nav-add-label">Add a pandal</span>
      </Link>
      <Link
        href="/saved"
        className={cn("nav-item", path === "/saved" && "active")}
        aria-current={path === "/saved" ? "page" : undefined}
      >
        <Bookmark size={22} strokeWidth={1.8} />
        <span>Saved</span>
      </Link>
    </nav>
  );
}
