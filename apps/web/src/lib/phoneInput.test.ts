import { describe, expect, it } from "vitest";
import { isValidIndiaMobileInput, PHONE_INPUT_PLACEHOLDER } from "./phoneInput";

describe("phoneInput", () => {
  it("regression_placeholder_is_local_number_without_country_prefix", () => {
    expect(PHONE_INPUT_PLACEHOLDER).toBe("9890200000");
    expect(PHONE_INPUT_PLACEHOLDER.startsWith("+")).toBe(false);
  });

  it("regression_india_mobile_rejects_letters_and_short_digits", () => {
    expect(isValidIndiaMobileInput("1234abc")).toBe(false);
    expect(isValidIndiaMobileInput("1234567890")).toBe(false);
    expect(isValidIndiaMobileInput("abcdefghij")).toBe(false);
    expect(isValidIndiaMobileInput("")).toBe(false);
    expect(isValidIndiaMobileInput("9890200000")).toBe(true);
    expect(isValidIndiaMobileInput("+91 98765 43210")).toBe(true);
    expect(isValidIndiaMobileInput("09876543210")).toBe(true);
  });
});
