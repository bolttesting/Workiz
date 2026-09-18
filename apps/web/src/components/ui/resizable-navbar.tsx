"use client";

import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const lastY = useRef(0);
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastY.current;
    const delta = latest - prev;

    setCompact(latest > 80);

    // Always show near the top; hide on scroll down, reveal on scroll up.
    if (latest < 40) {
      setHidden(false);
    } else if (delta > 8) {
      setHidden(true);
    } else if (delta < -8) {
      setHidden(false);
    }

    lastY.current = latest;
  });

  const nav = (
    <motion.div
      ref={ref}
      // Portaled to body so page-transition wrappers cannot break position:fixed
      className={cn("fixed inset-x-0 top-0 z-[1000] w-full pt-2", className)}
      animate={{
        transform: reduceMotion
          ? "translateY(0px)"
          : hidden
            ? "translateY(-120%)"
            : "translateY(0px)",
      }}
      transition={{
        duration: 0.28,
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ visible?: boolean }>, {
              visible: compact,
            })
          : child,
      )}
    </motion.div>
  );

  if (!mounted) return null;
  return createPortal(nav, document.body);
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(14px)" : "blur(0px)",
        boxShadow: visible
          ? "0 12px 40px rgba(16, 40, 70, 0.14), 0 0 0 1px rgba(16, 40, 70, 0.06)"
          : "0 0 0 1px transparent",
        width: visible ? "min(1120px, calc(100% - 2rem))" : "100%",
        y: reduceMotion ? 0 : visible ? 8 : 0,
        borderRadius: visible ? 9999 : 0,
        paddingLeft: visible ? 20 : 28,
        paddingRight: visible ? 20 : 28,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 36,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start py-2.5 lg:flex",
        visible ? "bg-white/95" : "bg-transparent",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const pathname = usePathname();

  return (
    <nav
      onMouseLeave={() => setHovered(null)}
      aria-label="Primary"
      className={cn(
        "absolute inset-0 z-10 hidden items-center justify-center pointer-events-none lg:flex",
        className,
      )}
    >
      <ul className="flex items-center gap-0.5 pointer-events-auto">
        {items.map((item, idx) => {
          const active =
            item.link === "/"
              ? pathname === "/"
              : pathname === item.link || pathname.startsWith(`${item.link}/`);

          return (
            <li key={`link-${idx}`}>
              <Link
                href={item.link}
                onMouseEnter={() => setHovered(idx)}
                onClick={onItemClick}
                className={cn(
                  "relative inline-flex items-center px-3.5 py-2 text-[16px] font-medium tracking-wide no-underline transition-colors !text-[#102846]/80 hover:!text-[#102846]",
                  active && "!text-[#102846] font-semibold",
                )}
              >
                {(hovered === idx || active) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-[#102846]/[0.06]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(14px)" : "blur(0px)",
        boxShadow: visible
          ? "0 12px 40px rgba(16, 40, 70, 0.14), 0 0 0 1px rgba(16, 40, 70, 0.06)"
          : "none",
        width: visible ? "calc(100% - 1.5rem)" : "100%",
        paddingLeft: visible ? 14 : 16,
        paddingRight: visible ? 14 : 16,
        borderRadius: visible ? 18 : 0,
        y: reduceMotion ? 0 : visible ? 6 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 36,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col items-center justify-between py-2 lg:hidden",
        visible ? "bg-white/95" : "bg-transparent",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children, className }: MobileNavHeaderProps) => {
  return (
    <div className={cn("flex w-full flex-row items-center justify-between gap-3", className)}>
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+8px)] z-50 flex w-full flex-col gap-1 rounded-2xl border border-[#102846]/10 bg-white px-3 py-4 shadow-[0_18px_50px_rgba(16,40,70,0.16)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#102846]/15 text-[#102846] transition hover:bg-[#102846]/[0.06]"
    >
      {isOpen ? <IconX size={20} stroke={1.75} /> : <IconMenu2 size={20} stroke={1.75} />}
    </button>
  );
};

export const NavbarLogo = ({
  href = "/",
  src = "/assets/images/logo.png",
  label = "WORKIZ",
}: {
  href?: string;
  src?: string;
  label?: string;
}) => {
  return (
    <Link
      href={href}
      className="relative z-20 mr-2 flex shrink-0 items-center gap-3 px-1 py-1 no-underline"
    >
      <img src={src} alt="" width={64} height={64} className="h-14 w-auto md:h-16" />
      <span className="font-[Outfit,sans-serif] text-[20px] font-bold tracking-[0.16em] text-[#102846] md:text-[22px]">
        {label}
      </span>
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient" | "ghost";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "relative z-20 inline-flex items-center justify-center rounded-full px-4 py-2 text-[16px] font-semibold tracking-wide transition duration-200 hover:-translate-y-0.5 no-underline";

  const variantStyles = {
    primary:
      "bg-[#b69856] text-[#102846] shadow-[0_8px_20px_rgba(182,152,86,0.28)] hover:bg-[#8f7338] hover:text-white",
    secondary:
      "bg-[#102846] text-white shadow-[0_8px_20px_rgba(16,40,70,0.18)] hover:bg-[#1a3a62]",
    ghost: "bg-transparent text-[#102846] shadow-none hover:bg-[#102846]/[0.06]",
    dark: "bg-[#102846] text-white",
    gradient:
      "bg-gradient-to-b from-[#b69856] to-[#8f7338] text-[#102846] shadow-[0_8px_20px_rgba(182,152,86,0.28)]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
