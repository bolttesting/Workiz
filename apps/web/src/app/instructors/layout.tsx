import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instructors",
  description: "Meet the instructors behind WORKIZ courses.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
