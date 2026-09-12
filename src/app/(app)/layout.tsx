import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth/session";
import { profileFromUser } from "@/lib/auth/user";
import { SessionRefresh } from "@/components/SessionRefresh";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = profileFromUser(await requireUser());
  return (
    <div className="app-shell">
      <SessionRefresh />
      <AppHeader initials={user.initials} />
      {children}
      <BottomNav />
    </div>
  );
}
