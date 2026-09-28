import { DIRHAM_SIGN } from "@workix/config";

type Props = {
  cents: number;
  currency?: string | null;
  className?: string;
};

/** Every price uses the UAE Dirham sign. */
export function Money({ cents, className }: Props) {
  const amount = ((Number(cents) || 0) / 100).toLocaleString("en-AE", {
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
