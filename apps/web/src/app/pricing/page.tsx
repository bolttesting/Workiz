"use client";

import { useState } from "react";
import { SEAT_PLANS, formatMoney } from "@workix/config";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { apiClient } from "@/lib/api";

export default function PricingPage() {
  const [seats, setSeats] = useState(100);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { url } = await apiClient<{ url: string }>("/checkout/seats", {
        method: "POST",
        body: JSON.stringify({ companyName, seats }),
      });
      window.location.href = url;
    } catch (err) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes("unauthorized")) {
        window.location.href = `/sign-in?next=/pricing`;
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Pricing plans" crumb="Pricing" />
      <div className="pricing-area style-inner">
        <div className="container">
          <div className="row section-title-space">
            <div className="col-lg-12 text-center">
              <div className="section_title">
                <h1>Contract seats for your workforce.</h1>
                <h1>Admins assign courses by department.</h1>
              </div>
            </div>
          </div>
          <div className="row">
            {SEAT_PLANS.map((plan) => (
              <div className="col-lg-4 col-md-6" key={plan.id}>
                <div className="single-pricing-box">
                  <div className="pricing-head">
                    <div className="pricing-head-content">
                      <h1>{plan.name}</h1>
                      <p>{plan.seats} seats</p>
                    </div>
                  </div>
                  <div className="pricing-body">
                    <p>{plan.blurb}</p>
                    <div className="pricing-rate">
                      <h2 className="price">
                        {formatMoney(plan.monthlyCents)} <span className="month">/mo guide</span>
                      </h2>
                    </div>
                  </div>
                  <div className="pricing-button">
                    <a
                      href="#seats"
                      onClick={() => {
                        setSeats(plan.seats);
                      }}
                    >
                      Choose {plan.seats} seats
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form id="seats" className="mt-5 p-4 border rounded" onSubmit={subscribe}>
            <h3>Start a company subscription</h3>
            <p>
              Contract the seats you need. Your company admin creates employee accounts and assigns the right courses —
              culture, professional skills, specialized training, and more.
            </p>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label>Company name</label>
                <input className="form-control" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="col-md-6 mb-3">
                <label>Seats</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  max={500}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                />
              </div>
            </div>
            {error ? <p className="text-danger">{error}</p> : null}
            <button className="btn btn_primary" disabled={loading} type="submit">
              {loading ? "Redirecting…" : "Continue to Stripe"}
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
