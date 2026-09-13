import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getAccount } from "@/lib/auth/account";
import { PandalDataProvider } from "@/components/PandalDataProvider";
import { SessionRefresh } from "@/components/SessionRefresh";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id, user } = await getAccount();
  return (
    <div className="app-shell">
      <SessionRefresh />
      <AppHeader initials={user.initials} />
      <PandalDataProvider key={id} userId={id}>{children}</PandalDataProvider>
      <BottomNav />
    </div>
  );
}
