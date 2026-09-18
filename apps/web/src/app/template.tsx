import { PageTransition } from "@/components/PageTransition";
import { ScrollRevealRoot } from "@/components/ScrollRevealRoot";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <ScrollRevealRoot />
      {children}
    </PageTransition>
  );
}
