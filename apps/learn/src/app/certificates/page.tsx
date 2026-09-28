"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import type { Course } from "@workix/db/types";

type Certificate = { id: string; course_id: string; issued_at: string; number?: string | null };

export default function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient<{ certificates: Certificate[] }>("/me/certificates"),
      apiClient<{ courses: Course[] }>("/me/enrollments"),
    ])
      .then(([certs, owned]) => {
        setItems(certs.certificates);
        const map: Record<string, string> = {};
        for (const course of owned.courses) map[course.id] = course.title;
        setTitles(map);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LearnShell>
      <LearnPageHeader title="Certificates" description="A PDF is issued when every lesson in a course is complete." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard title="Your certificates">
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Number</th>
                  <th>Issued</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert) => (
                  <tr key={cert.id}>
                    <td className="fw-medium text-primary-light">{titles[cert.course_id] ?? "Course certificate"}</td>
                    <td>{cert.number || "—"}</td>
                    <td>{cert.issued_at.slice(0, 10)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === cert.id}
                        onClick={() => {
                          setDownloading(cert.id);
                          setError(null);
                          const name = (titles[cert.course_id] ?? "certificate").replace(/[^\w]+/g, "-");
                          downloadFile(`/me/certificates/${cert.id}/pdf`, `${name}.pdf`)
                            .catch((err) => setError((err as Error).message))
                            .finally(() => setDownloading(null));
                        }}
                      >
                        {downloading === cert.id ? "Preparing…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 ? <EmptyState message="Finish every lesson in a course to earn a PDF certificate." /> : null}
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
