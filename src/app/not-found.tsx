import { Brand } from "@/components/Brand";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <main id="main-content" className="page-container">
      <Brand />
      <EmptyState
        title="This lane leads somewhere else."
        description="We couldn’t find that page. Let’s get you back to discovering Ganapatis."
      />
    </main>
  );
}
