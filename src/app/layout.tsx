import type { Metadata, Viewport } from "next";
import { FeedbackProvider } from "@/components/ui/Feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GaneshaNearMe — Discover Ganapatis around you",
    template: "%s | GaneshaNearMe",
  },
  description:
    "Find a little devotion around the corner. Explore Ganapati pandals, discover decorations and save your next darshan with GnM.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF7ED",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
