import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Brand, AppLogo } from "@/components/Brand";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Brand full href="/" />
        <Link href="/auth" className="button button-secondary button-small">
          Come on in
          <ArrowUpRight size={17} />
        </Link>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="festival-tag">
              <Sparkles size={16} /> A little devotion. A lot of discovery.
            </span>
            <p className="landing-product-name">GaneshaNearMe</p>
            <h1>
              Every lane.
              <br />A new story.
              <br />
              <em>Your Bappa.</em>
            </h1>
            <h2>Discover Ganapatis around you.</h2>
            <p className="landing-description">
              Explore public Ganapati pandals, discover decorations and save
              places you want to visit.
            </p>
            <div className="landing-ctas">
              <Link href="/auth" className="button button-primary">
                Explore Ganapatis
                <ArrowRight size={19} />
              </Link>
              <Link href="/auth" className="button button-secondary">
                List Your Pandal
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <span className="landing-city">
              <MapPin size={16} /> Starting with Nagpur. Celebrating together.
            </span>
          </div>
          <div className="landing-art">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <span className="hero-spark hero-spark-one">✦</span>
            <span className="hero-spark hero-spark-two">✧</span>
            <div className="hero-arch">
              <Image
                src="/illustrations/ganapati-saffron.svg"
                alt="Original illustration of Ganapati in a marigold-adorned festive pandal"
                fill
                priority
                sizes="(max-width: 800px) 90vw, 540px"
              />
            </div>
            <div className="hero-floating-card floating-left">
              <span className="floating-icon">
                <MapPin size={20} />
              </span>
              <div>
                <strong>Bappa is closer than you think</strong>
                <span>Discover the joy around you</span>
              </div>
            </div>
            <div className="hero-floating-card floating-right">
              <AppLogo className="size-8 text-orange-500" />
              <div>
                <strong>One city. Countless blessings.</strong>
                <span>Made for your Ganeshotsav</span>
              </div>
            </div>
            <span className="hero-art-caption">गणपती बाप्पा मोरया!</span>
          </div>
        </section>
        <section
          className="landing-features"
          aria-label="A festival made easier"
        >
          <div>
            <span>
              <MapPin size={22} />
            </span>
            <div>
              <h3>Discover nearby</h3>
              <p>Beautiful pandals, just around the corner.</p>
            </div>
          </div>
          <div>
            <span>
              <Bookmark size={21} />
            </span>
            <div>
              <h3>Save your favourites</h3>
              <p>Keep your next darshan close at hand.</p>
            </div>
          </div>
          <div>
            <span>
              <Heart size={21} />
            </span>
            <div>
              <h3>Celebrate together</h3>
              <p>Share the places that bring you joy.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>© 2026 GaneshaNearMe</span>
        <span>Made with devotion, for the community.</span>
      </footer>
    </div>
  );
}
