import { EdudashScripts } from "@/components/EdudashScripts";

export const metadata = {
  title: "WORKIZ Admin",
};

const css = [
  "/assets/css/remixicon.css",
  "/assets/css/lib/bootstrap.min.css",
  "/assets/css/lib/dataTables.min.css",
  "/assets/css/style.css",
  "/assets/css/workix-brand.css",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="/assets/images/favicon.png" />
        {css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        {children}
        <EdudashScripts />
      </body>
    </html>
  );
}
