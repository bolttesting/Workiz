"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

type Instructor = {
  slug: string;
  headline: string | null;
  bio: string | null;
  user: { full_name: string | null; avatar_url: string | null } | null;
  courses: { slug: string; title: string }[];
};

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/instructors`)
      .then((r) => r.json())
      .then((j) => setInstructors(j.instructors ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Instructors" crumb="Instructors" />
      <div className="team-area style-one inner">
        <div className="container">
          <div className="row">
            {instructors.map((person) => (
              <div className="col-xl-4 col-lg-6 col-md-6" key={person.slug}>
                <div className="single-team-box box-1">
                  <div className="team-thumb">
                    <img src={person.user?.avatar_url || "/assets/images/inner-img/team-thumb11.png"} alt="" />
                  </div>
                  <div className="team-content">
                    <div className="team-title">
                      <h3>
                        <Link href={`/instructors/${person.slug}`}>{person.user?.full_name || "Instructor"}</Link>
                      </h3>
                    </div>
                    <div className="team-sub-title">
                      <span>{person.headline}</span>
                    </div>
                    <p>{person.courses.length} courses</p>
                  </div>
                </div>
              </div>
            ))}
            {instructors.length === 0 ? <p>Instructors will appear here after admin assigns them.</p> : null}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
