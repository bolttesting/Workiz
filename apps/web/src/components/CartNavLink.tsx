"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartNavLink({ className = "" }: { className?: string }) {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className={`workiz-cart-nav ${className}`.trim()}
      aria-label={count ? `Cart, ${count} items` : "Cart"}
    >
      <ShoppingCart size={18} strokeWidth={2.2} aria-hidden="true" />
      {count > 0 ? <span className="workiz-cart-nav__badge">{count > 9 ? "9+" : count}</span> : null}
    </Link>
  );
}
