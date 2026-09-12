import Link from "next/link";
import { MapPin, Plus, UserRound } from "lucide-react";
import { Brand } from "./Brand";

export function AppHeader() {
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
          <Link href="/add" className="header-add">
            <Plus size={17} /> List your pandal
          </Link>
          <Link
            href="/profile"
            className="avatar-button"
            aria-label="Your profile"
          >
            <UserRound size={21} />
          </Link>
        </div>
      </div>
    </header>
  );
}
