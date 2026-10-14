import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about buying courses, company seats, certificates and payments on WORKIZ.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
