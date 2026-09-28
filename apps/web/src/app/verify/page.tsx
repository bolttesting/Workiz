"use client";

import { FormEvent, useState } from "react";
import { Breadcrumb, SiteFooter, SiteHeader } from "@/components/SiteChrome";

type Result = {
  found: boolean;
  number?: string | null;
  learnerName?: string;
  companyName?: string | null;
  courseTitle?: string;
  issuedAt?: string;
};

export default function VerifyCertificatePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError("Enter the certificate number from the PDF.");
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${api}/certificates/verify?code=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("The check could not be completed.");
      setResult((await res.json()) as Result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Check a certificate" crumb="Verify" />
      <div className="contact-area style-two py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-7">
              <form className="card radius-12 shadow-1 p-4" onSubmit={onSubmit}>
                <h3 className="mb-8">Certificate check</h3>
                <p className="text-secondary-light mb-16">
                  Enter the number printed on a WORKIZ certificate. You will see the learner name, the course, and the date it was issued.
                </p>
                <label className="form-label" htmlFor="certificate-code">
                  Certificate number
                </label>
                <input
                  id="certificate-code"
                  className="form-control radius-8 mb-16"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="WX-XXXXXXXX"
                  autoComplete="off"
                />
                <button className="btn btn-primary-600 radius-8" type="submit" disabled={busy}>
                  {busy ? "Checking…" : "Check certificate"}
                </button>
                {error ? (
                  <div className="alert alert-danger radius-8 mt-16 mb-0" role="alert">
                    {error}
                  </div>
                ) : null}
                {result && !result.found ? (
                  <div className="alert alert-warning radius-8 mt-16 mb-0" role="status">
                    No certificate matches that number.
                  </div>
                ) : null}
                {result?.found ? (
                  <div className="alert alert-success radius-8 mt-16 mb-0" role="status">
                    <div className="fw-semibold">{result.learnerName}</div>
                    {result.companyName ? <div>{result.companyName}</div> : null}
                    <div>{result.courseTitle}</div>
                    <div>Issued {result.issuedAt?.slice(0, 10)}</div>
                    {result.number ? <div>Number {result.number}</div> : null}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
