"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";

export default function CertificatesPage() {
  const [items, setItems] = useState<{ id: string; course_id: string; url: string | null; issued_at: string }[]>([]);
  useEffect(() => {
    apiClient<{ certificates: typeof items }>("/me/certificates")
      .then((r) => setItems(r.certificates))
      .catch(() => undefined);
  }, []);
  return (
    <LearnShell>
      <h6 className="mb-24">Certificates</h6>
      <div className="card radius-12">
        <div className="card-body">
          {items.length === 0 ? <p>Finish every lesson in a course to earn a PDF certificate.</p> : null}
          <ul>
            {items.map((c) => (
              <li key={c.id}>
                {c.issued_at.slice(0, 10)}{" "}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer">
                    Download PDF
                  </a>
                ) : (
                  "Generating…"
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </LearnShell>
  );
}
