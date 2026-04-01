/**
 * Merges class names, filtering out falsy values.
 */
export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}

/**
 * Format currency from cents to a display string.
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code (default: "USD")
 * @param locale - BCP 47 locale (default: "en-US")
 */
export function formatCurrency(cents: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format a date string or Date object to a human-readable date.
 */
export function formatDate(date: string | Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
