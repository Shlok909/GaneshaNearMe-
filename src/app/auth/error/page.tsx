import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/Brand";

export const metadata: Metadata = {
  title: "Authentication problem",
  robots: { index: false },
};

export default function AuthErrorPage() {
  return (
    <main id="main-content" className="auth-error-page">
      <div className="auth-error-card">
        <Brand full href="/" />
        <h1>Authentication problem</h1>
        <p>We couldn&apos;t complete that authentication request.</p>
        <p>
          The confirmation link may have expired or already been used. Return to
          login to try again.
        </p>
        <Link href="/auth" className="button button-primary">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
