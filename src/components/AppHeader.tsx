import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Brand } from "./Brand";
import { AboutDialog } from "./AboutDialog";

export function AppHeader({ initials }: { initials: string }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Brand full />
        <div className="header-location">
          <MapPin size={16} />
          <span>Nagpur, Maharashtra</span>
          <span className="location-live" />
        </div>
        <div className="header-actions">
          <AboutDialog />
          <Link href="/add" className="header-add">
            <Plus size={17} /> List your pandal
          </Link>
          <Link
            href="/profile"
            className="avatar-button"
            aria-label="Your profile"
          >
            <span aria-hidden="true">{initials}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
