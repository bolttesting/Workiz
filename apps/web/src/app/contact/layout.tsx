import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the WORKIZ team about courses or company training. Call, email or message us on WhatsApp.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
