/** Example local mobile number — no country prefix (backend normalizes to E.164). */
export const PHONE_INPUT_PLACEHOLDER = "9890200000";

/**
 * India mobile / WhatsApp for public franchise + lead forms.
 * Allows spaces, dashes, parentheses, and optional +91 / 0 prefix.
 * Rejects letters and short/invalid digit strings (e.g. `1234abc`).
 */
export function isValidIndiaMobileInput(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return false;
  if (/[a-zA-Z]/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 11 && digits.startsWith("0")) return /^0[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith("91")) return /^91[6-9]\d{9}$/.test(digits);
  return false;
}

export const INDIA_MOBILE_INVALID_MESSAGE =
  "Enter a valid 10-digit mobile / WhatsApp number (digits only).";
