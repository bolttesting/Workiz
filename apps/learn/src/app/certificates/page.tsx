"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { EmptyState, LearnDataCard, LearnPageHeader, LoadingState } from "@/components/LearnUi";
import { apiClient, downloadFile } from "@/lib/api";
import type { Course, Profile } from "@workix/db/types";

type Certificate = { id: string; course_id: string; issued_at: string; number?: string | null };
type CompanyCertificate = {
  id: string;
  name: string | null;
  email: string;
  courseTitle: string;
  issuedAt: string;
  number?: string | null;
};

export default function CertificatesPage() {
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [items, setItems] = useState<Certificate[]>([]);
  const [companyItems, setCompanyItems] = useState<CompanyCertificate[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<{ profile: Profile }>("/me")
      .then(async (me) => {
        setRole(me.profile.role);
        if (me.profile.role === "company_admin") {
          const res = await apiClient<{ certificates: CompanyCertificate[] }>("/orgs/certificates");
          setCompanyItems(res.certificates);
          setError(null);
          return;
        }
        const [certs, owned] = await Promise.all([
          apiClient<{ certificates: Certificate[] }>("/me/certificates"),
          apiClient<{ courses: Course[] }>("/me/enrollments"),
        ]);
        setItems(certs.certificates);
        const map: Record<string, string> = {};
        for (const course of owned.courses) map[course.id] = course.title;
        setTitles(map);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const managing = role === "company_admin";

  return (
    <LearnShell>
      <LearnPageHeader
        title="Certificates"
        description={
          loading
            ? undefined
            : managing
              ? "Certificates earned by learners in your company."
              : "A PDF is issued when every lesson is complete, and the quiz is passed when the course has one."
        }
      />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      <LearnDataCard title={managing ? "Learner certificates" : "Your certificates"}>
        {loading ? <LoadingState /> : null}
        {!loading && managing ? (
          <div className="workiz-admin-table-wrap">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Course</th>
                  <th>Number</th>
                  <th>Issued</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {companyItems.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <div className="fw-medium text-primary-light">{cert.name?.trim() || "Learner"}</div>
                      <div className="text-sm text-secondary-light">{cert.email}</div>
                    </td>
                    <td>{cert.courseTitle}</td>
                    <td>{cert.number || "—"}</td>
                    <td>{cert.issuedAt.slice(0, 10)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-primary-600 btn-sm radius-8"
                        disabled={downloading === cert.id}
                        onClick={() => {
                          setDownloading(cert.id);
                          setError(null);
                          const name = cert.courseTitle.replace(/[^\w]+/g, "-");
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
            {companyItems.length === 0 ? (
              <EmptyState message="Certificates appear here when a learner finishes a course." />
            ) : null}
          </div>
        ) : null}
        {!loading && !managing ? (
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
            {items.length === 0 ? (
              <EmptyState message="Finish every lesson, and pass the quiz when the course has one, to earn a certificate." />
            ) : null}
          </div>
        ) : null}
      </LearnDataCard>
    </LearnShell>
  );
}
