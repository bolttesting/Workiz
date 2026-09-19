"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { CartCheckout } from "@/components/CartCheckout";
import { SeatsCheckout } from "@/components/SeatsCheckout";

function CartBody() {
  const searchParams = useSearchParams();
  const showSeats = searchParams.get("kind") === "seats";

  return showSeats ? <SeatsCheckout /> : <CartCheckout />;
}

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Cart" crumb="Cart" />
      <Suspense
        fallback={
          <section className="workiz-cart">
            <div className="container">
              <p className="workiz-cart__lede">Loading cart…</p>
            </div>
          </section>
        }
      >
        <CartBody />
      </Suspense>
      <SiteFooter />
    </>
  );
}
