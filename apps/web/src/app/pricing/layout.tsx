import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company training",
  description: "Buy seats for your team and assign WORKIZ courses by person or department. Prices in AED.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
