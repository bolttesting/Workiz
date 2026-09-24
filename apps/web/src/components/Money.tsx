import { DIRHAM_SIGN, formatMoney } from "@workix/config";

type Props = {
  cents: number;
  currency?: string | null;
  className?: string;
};

/** Renders money; AED Dirham glyph is sized to match the digits. */
export function Money({ cents, currency = "usd", className }: Props) {
  const code = (currency || "usd").toUpperCase();
  if (code === "AED") {
    const amount = (cents / 100).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <span className={className}>
        <span className="dirham-glyph" aria-hidden="true">
          {DIRHAM_SIGN}
        </span>
        {amount}
      </span>
    );
  }
  return <span className={className}>{formatMoney(cents, code)}</span>;
}
