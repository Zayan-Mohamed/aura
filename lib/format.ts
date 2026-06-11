import type { Money } from "./kapruka";

/** "Rs 3,500" for LKR, locale currency formatting otherwise. */
export function formatMoney(money?: Money | null): string {
  if (!money || money.amount == null) return "Price on request";
  const { amount, currency } = money;
  if (currency === "LKR") {
    return `Rs ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(amount)}`;
  }
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** Percentage off, when a compare-at price is present and higher. */
export function discountPct(price?: Money | null, compareAt?: Money | null): number | null {
  if (!price?.amount || !compareAt?.amount || compareAt.amount <= price.amount) return null;
  return Math.round(((compareAt.amount - price.amount) / compareAt.amount) * 100);
}

/** Human "in 42 min" style countdown to an ISO timestamp. */
export function minutesUntil(iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((t - Date.now()) / 60000));
}

/** Title-case a lowercase Kapruka category slug like "newadditions". */
export function prettyLabel(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
