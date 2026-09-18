"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import type { Course } from "@workix/db/types";

export default function InstructorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [name, setName] = useState("Instructor");
  const [headline, setHeadline] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [photo, setPhoto] = useState("/assets/images/inner-img/team-thumb11.png");
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/instructors/${slug}`)
      .then((r) => r.json())
      .then((j) => {
        setName(j.instructor?.user?.full_name || "Instructor");
        setHeadline(j.instructor?.headline);
        setBio(j.instructor?.bio);
        setPhoto(j.instructor?.user?.avatar_url || "/assets/images/inner-img/team-thumb11.png");
        setCourses(j.courses ?? []);
      })
      .catch(() => undefined);
  }, [slug]);

  return (
    <>
      <SiteHeader />
      <Breadcrumb title={name} crumb="Instructor" />
      <section className="course-details-area style-inner">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <img src={photo} alt="" className="w-100 radius-8" />
            </div>
            <div className="col-lg-8">
              <h2>{name}</h2>
              <p>{headline}</p>
              <p>{bio}</p>
              <h4 className="mt-4">Courses</h4>
              <ul>
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/courses/${c.slug}`}>{c.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
