import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Heart } from "lucide-react";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Welcome" };

export default function AuthPage() {
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-story">
        <Brand full href="/" />
        <div className="auth-story-copy">
          <p className="eyebrow">Discover. Celebrate. Belong.</p>
          <h2>
            Many pandals.
            <br />
            One shared <em>feeling.</em>
          </h2>
          <p>
            Find the celebrations that make your city feel a little more like
            home.
          </p>
        </div>
        <div className="auth-art">
          <Image
            src="/illustrations/ganapati-saffron.svg"
            alt="Festive illustration of Ganapati"
            fill
            priority
            sizes="50vw"
          />
        </div>
        <p className="auth-story-footer">
          <Heart size={16} />
          Made for the community, with devotion.
        </p>
      </section>
      <section className="auth-panel">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} />
          Back to GaneshaNearMe
        </Link>
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <Brand full href="/" />
          </div>
          <AuthForm />
        </div>
        <span className="auth-copyright">© 2026 GaneshaNearMe</span>
      </section>
    </main>
  );
}
