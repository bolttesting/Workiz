"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import type { Course } from "@workix/db/types";
import { useCart } from "@/lib/cart";
import { apiClient } from "@/lib/api";

export function CourseBuyActions({ course }: { course: Course }) {
  const router = useRouter();
  const { addItem, hasItem } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const inCart = hasItem(course.id);

  function addToCart() {
    setError(null);
    const added = addItem({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      thumbnail_url: course.thumbnail_url,
      price_cents: course.price_cents,
      currency: course.currency,
    });
    setMessage(added ? "Added to cart" : "Already in cart");
    window.setTimeout(() => setMessage(null), 2200);
  }

  async function buyNow() {
    setBuying(true);
    setError(null);
    try {
      addItem({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        thumbnail_url: course.thumbnail_url,
        price_cents: course.price_cents,
        currency: course.currency,
      });
      const { url } = await apiClient<{ url: string }>("/checkout/course", {
        method: "POST",
        body: JSON.stringify({ courseId: course.id }),
      });
      window.location.href = url;
    } catch (err) {
      const text = (err as Error).message;
      if (text.toLowerCase().includes("unauthorized")) {
        addItem({
          id: course.id,
          slug: course.slug,
          title: course.title,
          subtitle: course.subtitle,
          thumbnail_url: course.thumbnail_url,
          price_cents: course.price_cents,
          currency: course.currency,
        });
        router.push(`/sign-up?next=${encodeURIComponent("/cart?checkout=1")}`);
        return;
      }
      setError(text);
      setBuying(false);
    }
  }

  return (
    <div className="workiz-buy-actions">
      <button
        type="button"
        className="workiz-course-detail__cta"
        onClick={buyNow}
        disabled={buying}
      >
        {buying ? "Redirecting…" : "Buy this course"}
      </button>

      <button
        type="button"
        className={`workiz-course-detail__cta-secondary workiz-buy-actions__cart${inCart ? " is-in-cart" : ""}`}
        onClick={addToCart}
      >
        {inCart ? (
          <>
            <Check size={15} strokeWidth={2.4} aria-hidden="true" />
            In cart
          </>
        ) : (
          <>
            <ShoppingCart size={15} strokeWidth={2.2} aria-hidden="true" />
            Add to cart
          </>
        )}
      </button>

      {inCart ? (
        <Link href="/cart" className="workiz-buy-actions__view-cart">
          View cart
        </Link>
      ) : null}

      {message ? <p className="workiz-buy-actions__msg">{message}</p> : null}
      {error ? <p className="workiz-buy-actions__err">{error}</p> : null}
    </div>
  );
}
