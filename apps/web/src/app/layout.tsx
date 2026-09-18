import { EducateScripts } from "@/components/EducateScripts";
import { SiteLoader } from "@/components/SiteLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import "./globals.css";

export const metadata = {
  title: "WORKIZ",
  description:
    "Dubai-based professional training by Workiz Support Solutions - FZCO. Company admins assign courses to employees across departments.",
};

const css = [
  "/assets/css/bootstrap.min.css",
  "/assets/css/owl.carousel.min.css",
  "/assets/css/animate.css",
  "/assets/css/animated-text.css",
  "/assets/css/all.min.css",
  "/assets/css/theme-default.css",
  "/assets/css/meanmenu.min.css",
  "/assets/css/owl.transitions.css",
  "/venobox/venobox.css",
  "/assets/css/bootstrap-icons.css",
  "/assets/css/flaticon.css",
  "/assets/css/style.css",
  "/assets/css/responsive.css",
  "/assets/css/coustom-animation.css",
  "/assets/css/odometer-theme-default.css",
  "/assets/css/scroll-up.css",
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
        <SiteLoader />
        {children}
        <ScrollToTop />
        <EducateScripts />
      </body>
    </html>
  );
}
