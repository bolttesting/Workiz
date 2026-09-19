"use client";

import { motion, useSpring } from "motion/react";
import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { Check, Star as LucideStar } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workiz-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-workiz-gold text-workiz-navy hover:bg-workiz-cream",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-workiz-navy/20 bg-white text-workiz-navy hover:border-workiz-gold hover:bg-workiz-cream/40",
        secondary: "bg-workiz-cream text-workiz-navy hover:bg-workiz-cream/80",
        ghost: "hover:bg-workiz-cream/50 hover:text-workiz-navy",
        link: "text-workiz-gold underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

function Star({
  mousePosition,
  containerRef,
}: {
  mousePosition: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [initialPos] = useState({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
  });
  const [size] = useState(1 + Math.random() * 2);

  const springConfig = { stiffness: 100, damping: 15, mass: 0.1 };
  const springX = useSpring(0, springConfig);
  const springY = useSpring(0, springConfig);

  useEffect(() => {
    if (!containerRef.current || mousePosition.x === null || mousePosition.y === null) {
      springX.set(0);
      springY.set(0);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const starX = containerRect.left + (parseFloat(initialPos.left) / 100) * containerRect.width;
    const starY = containerRect.top + (parseFloat(initialPos.top) / 100) * containerRect.height;

    const deltaX = mousePosition.x - starX;
    const deltaY = mousePosition.y - starY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const radius = 600;

    if (distance < radius) {
      const force = 1 - distance / radius;
      springX.set(deltaX * force * 0.5);
      springY.set(deltaY * force * 0.5);
    } else {
      springX.set(0);
      springY.set(0);
    }
  }, [mousePosition, initialPos, containerRef, springX, springY]);

  return (
    <motion.div
      className="absolute rounded-full bg-foreground"
      style={{
        top: initialPos.top,
        left: initialPos.left,
        width: `${size}px`,
        height: `${size}px`,
        x: springX,
        y: springY,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: 2 + Math.random() * 3,
        repeat: Infinity,
        delay: Math.random() * 5,
      }}
    />
  );
}

function InteractiveStarfield({
  mousePosition,
  containerRef,
}: {
  mousePosition: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      {Array.from({ length: 150 }).map((_, i) => (
        <Star key={`star-${i}`} mousePosition={mousePosition} containerRef={containerRef} />
      ))}
    </div>
  );
}

export interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular?: boolean;
  seats?: number;
  planId?: string;
  isCustom?: boolean;
  pricePerSeatCents?: number;
  minSeats?: number;
  maxSeats?: number;
  defaultSeats?: number;
}

interface PricingSectionProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  onSelectPlan?: (plan: PricingPlan, seats?: number) => void;
}

const PricingContext = createContext<{
  isMonthly: boolean;
  setIsMonthly: (value: boolean) => void;
  onSelectPlan?: (plan: PricingPlan, seats?: number) => void;
}>({
  isMonthly: true,
  setIsMonthly: () => {},
});

export function PricingSection({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that's right for you. All plans include our core features and support.",
  onSelectPlan,
}: PricingSectionProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{
    x: number | null;
    y: number | null;
  }>({ x: null, y: null });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <PricingContext.Provider value={{ isMonthly, setIsMonthly, onSelectPlan }}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePosition({ x: null, y: null })}
        className="workiz-pricing-section relative w-full bg-[#faf8f4] py-12 sm:py-16 lg:py-20"
      >
        <InteractiveStarfield mousePosition={mousePosition} containerRef={containerRef} />
        <div className="relative z-10 container mx-auto px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl space-y-4 text-center sm:mb-12">
            <h2 className="text-[1.75rem] font-bold tracking-tighter text-workiz-navy sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="whitespace-pre-line text-base text-muted-foreground sm:text-lg">{description}</p>
          </div>
          <PricingToggle />
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 items-stretch gap-6 sm:mt-12 sm:gap-8 lg:grid-cols-2">
            {plans.map((plan, index) => (
              <PricingCard key={plan.name} plan={plan} index={index} />
            ))}
          </div>
        </div>
      </div>
    </PricingContext.Provider>
  );
}

function PricingToggle() {
  const { isMonthly, setIsMonthly } = useContext(PricingContext);
  const confettiRef = useRef<HTMLDivElement>(null);
  const monthlyBtnRef = useRef<HTMLButtonElement>(null);
  const annualBtnRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const btnRef = isMonthly ? monthlyBtnRef : annualBtnRef;
    if (btnRef.current) {
      setPillStyle({
        width: btnRef.current.offsetWidth,
        transform: `translateX(${btnRef.current.offsetLeft}px)`,
      });
    }
  }, [isMonthly]);

  const handleToggle = (monthly: boolean) => {
    if (isMonthly === monthly) return;
    setIsMonthly(monthly);

    if (!monthly && confettiRef.current) {
      const rect = annualBtnRef.current?.getBoundingClientRect();
      if (!rect) return;

      confetti({
        particleCount: 80,
        spread: 80,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#b69856", "#102846", "#f3e6c8"],
        ticks: 300,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div ref={confettiRef} className="relative flex w-fit items-center rounded-full bg-workiz-cream p-1">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-workiz-gold p-1"
          style={pillStyle}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
        <button
          ref={monthlyBtnRef}
          type="button"
          onClick={() => handleToggle(true)}
          className={cn(
            "relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-6",
            isMonthly ? "text-workiz-navy" : "text-muted-foreground hover:text-workiz-navy",
          )}
        >
          Monthly
        </button>
        <button
          ref={annualBtnRef}
          type="button"
          onClick={() => handleToggle(false)}
          className={cn(
            "relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-6",
            !isMonthly ? "text-workiz-navy" : "text-muted-foreground hover:text-workiz-navy",
          )}
        >
          Annual
          <span className={cn("hidden sm:inline", !isMonthly ? "text-workiz-navy/70" : "")}>
            {" "}
            (Save 20%)
          </span>
        </button>
      </div>
    </div>
  );
}

function PricingCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const { isMonthly, onSelectPlan } = useContext(PricingContext);
  const [customSeats, setCustomSeats] = useState(plan.defaultSeats ?? plan.seats ?? 250);

  const pricePerSeat = (plan.pricePerSeatCents ?? 2000) / 100;
  const monthlyPerSeat = isMonthly ? pricePerSeat : Math.round(pricePerSeat * 0.8);
  const customTotal = customSeats * monthlyPerSeat;
  const displayPrice = plan.isCustom
    ? customTotal
    : isMonthly
      ? Number(plan.price)
      : Number(plan.yearlyPrice);

  function choosePlan() {
    onSelectPlan?.(plan, plan.isCustom ? customSeats : plan.seats);
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: index * 0.15,
      }}
      className={cn(
        "relative flex h-full flex-col rounded-2xl bg-white/90 p-6 backdrop-blur-sm sm:p-8",
        plan.isPopular ? "border-2 border-workiz-gold shadow-xl" : "border border-workiz-navy/12",
      )}
    >
      {plan.isPopular ? (
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-workiz-gold px-3 py-1.5 sm:px-4">
            <LucideStar className="h-4 w-4 fill-current text-workiz-navy" />
            <span className="text-sm font-semibold text-workiz-navy">Most Popular</span>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col pt-2 text-center">
        <h3 className="text-xl font-semibold text-workiz-navy">{plan.name}</h3>
        <p className="mt-2 min-h-[2.5rem] text-sm text-muted-foreground">{plan.description}</p>

        <div className="mt-6 flex min-h-[7.5rem] flex-col items-center justify-start">
          <div className="flex items-baseline justify-center gap-x-1">
            <span className="text-4xl font-bold tracking-tight text-workiz-navy sm:text-5xl">
              <NumberFlow
                value={displayPrice}
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }}
                className="font-variant-numeric: tabular-nums"
              />
            </span>
            <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
              / {plan.period}
            </span>
          </div>
          {plan.isCustom ? (
            <>
              <p className="mt-2 text-sm font-medium text-workiz-navy">
                ${monthlyPerSeat} per user / month
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isMonthly ? "Billed monthly" : "Billed annually (20% off)"} · {customSeats} seats
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {isMonthly ? "Billed monthly" : "Billed annually"}
            </p>
          )}
        </div>

        {plan.isCustom ? (
          <div className="workiz-seat-slider mt-2 text-left">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <label htmlFor={`seat-slider-${plan.planId}`} className="font-semibold text-workiz-navy">
                Seats
              </label>
              <strong className="tabular-nums text-workiz-navy">{customSeats}</strong>
            </div>
            <input
              id={`seat-slider-${plan.planId}`}
              type="range"
              min={plan.minSeats ?? 50}
              max={plan.maxSeats ?? 500}
              step={1}
              value={customSeats}
              onChange={(e) => setCustomSeats(Number(e.target.value))}
              className="workiz-seat-slider__input"
              aria-valuemin={plan.minSeats ?? 50}
              aria-valuemax={plan.maxSeats ?? 500}
              aria-valuenow={customSeats}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{plan.minSeats ?? 50}</span>
              <span>{plan.maxSeats ?? 500}</span>
            </div>
          </div>
        ) : (
          <div className="workiz-seat-slider workiz-seat-slider--spacer mt-2" aria-hidden="true" />
        )}

        <ul role="list" className="mt-8 space-y-3 text-left text-sm leading-6 text-muted-foreground">
          {(plan.isCustom
            ? plan.features.map((feature) =>
                feature.includes("__SEATS__")
                  ? feature.replace("__SEATS__", String(customSeats))
                  : feature,
              )
            : plan.features
          ).map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-workiz-gold" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Button
            asChild
            variant={plan.isPopular || plan.isCustom ? "default" : "outline"}
            size="lg"
            className="w-full"
          >
            <Link href="/cart?kind=seats" onClick={choosePlan}>
              {plan.isCustom ? `Choose ${customSeats} seats` : plan.buttonText}
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

