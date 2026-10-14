import type { Metadata } from "next";
import { ScrollToTop } from "@/components/ScrollToTop";
import { HelpWidget } from "@/components/HelpWidget";
import "./globals.css";

const SITE_DESCRIPTION =
  "Dubai-based professional training by Workiz Support Solutions - FZCO. Buy a course for yourself, or give your team seats and assign training by department.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"),
  title: { default: "WORKIZ — Professional training in Dubai", template: "%s | WORKIZ" },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "WORKIZ",
    locale: "en_AE",
    description: SITE_DESCRIPTION,
    images: [{ url: "/assets/images/home-one/hero-workiz.png", width: 525, height: 640, alt: "WORKIZ professional training" }],
  },
  twitter: { card: "summary_large_image" },
};

const css = [
  "/assets/css/bootstrap.min.css",
  "/assets/css/workix-keyframes.css",
  "/assets/css/all.min.css",
  "/assets/css/theme-default.css",
  "/assets/css/flaticon.css",
  "/assets/css/style.css",
  "/assets/css/responsive.css",
  "/assets/css/workix-images.css",
  "/assets/css/workix-brand.css",
  "/assets/css/workix-header.css",
  "/assets/css/workix-auth.css",
  "/assets/css/workix-responsive.css",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/images/fav-icon/icon.png" />
        {css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        {children}
        <ScrollToTop />
        <HelpWidget />
      </body>
    </html>
  );
}
