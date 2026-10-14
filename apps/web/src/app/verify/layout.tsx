import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check that a WORKIZ certificate is genuine using its certificate number.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
