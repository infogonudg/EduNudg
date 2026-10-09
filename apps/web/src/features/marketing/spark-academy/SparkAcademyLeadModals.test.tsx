import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LeadModalProvider } from "@/features/marketing/abacus-classic/LeadModalContext";
import { MarketingLeadModals } from "@/features/marketing/abacus-classic/MarketingLeadModals";
import { exactAccessibleName } from "@/test/exactAccessibleName";
import { SparkAcademyCta } from "./SparkAcademyCta";

function polyfillDialog() {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
}

describe("Spark Academy lead modals", () => {
  beforeEach(() => {
    polyfillDialog();
  });

  it("regression_spark_lead_modals_use_theme_classes", () => {
    render(
      <LeadModalProvider>
        <SparkAcademyCta label="Book demo" href="enroll" variant="dark" />
        <SparkAcademyCta label="Apply now" href="apply" variant="outline" />
        <MarketingLeadModals brandSlug="smart-brain-abacus" theme="spark-academy" />
      </LeadModalProvider>
    );

    expect(document.querySelectorAll("dialog.ac-modal--spark")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: exactAccessibleName("Book demo") }));
    const enroll = screen.getByRole("heading", { level: 2, name: "Book a free demo class" }).closest("dialog");
    expect(enroll?.classList.contains("ac-modal--spark")).toBe(true);
    expect(enroll?.open).toBe(true);
    expect(screen.getByLabelText("Parent name")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: exactAccessibleName("Apply now") }));
    const apply = screen.getByRole("heading", { level: 2, name: "Apply for franchise" }).closest("dialog");
    expect(apply?.classList.contains("ac-modal--spark")).toBe(true);
    expect(apply?.open).toBe(true);
    expect(screen.getByLabelText("Full name")).toBeDefined();
  });

  it("regression_franchise_apply_requires_whatsapp_phone", () => {
    render(
      <LeadModalProvider>
        <SparkAcademyCta label="Apply now" href="apply" variant="outline" />
        <MarketingLeadModals brandSlug="smart-brain-abacus" theme="spark-academy" />
      </LeadModalProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: exactAccessibleName("Apply now") }));
    const applyDialog = screen.getByRole("heading", { level: 2, name: "Apply for franchise" }).closest(
      "dialog"
    ) as HTMLElement;
    const apply = within(applyDialog);
    const submit = apply.getByRole("button", { name: exactAccessibleName("Apply for franchise") });
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(apply.getByLabelText("Full name"), { target: { value: "Priya K" } });
    fireEvent.change(apply.getByLabelText("Email"), { target: { value: "priya@example.com" } });
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(apply.getByLabelText("WhatsApp number"), { target: { value: "1234abc" } });
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(apply.getByLabelText("WhatsApp number"), { target: { value: "9890200000" } });
    expect(submit).toHaveProperty("disabled", false);
  });

  it("regression_spark_lead_modal_css_matches_theme_tokens", () => {
    const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");
    expect(css).toMatch(/\.ac-modal--spark \{\s*font-family:\s*var\(--sa-heading-font\)/);
    expect(css).toMatch(/\.ac-modal--spark \.ac-modal__header h2/);
    expect(css).toMatch(/\.ac-modal--spark \.ed-btn--primary/);
    expect(css).toMatch(/\.ac-modal--spark \.ed-field__input:focus/);
  });

  it("regression_spark_homepage_motion_css_respects_reduced_motion", () => {
    const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");
    expect(css).toMatch(/@keyframes sa-rise/);
    expect(css).toMatch(/@keyframes sa-float/);
    expect(css).toMatch(/@keyframes sa-item-in[\s\S]*scale\(0\.94\)/);
    expect(css).toMatch(/\.sa-reveal \{[\s\S]*translateY\(16px\)/);
    expect(css).toMatch(/\.sa-reveal \{[\s\S]*transform 0\.95s/);
    expect(css).toMatch(/sa-item-in 1\.1s/);
    expect(css).toMatch(/animation-delay: 0\.55s/);
    expect(css).toMatch(/\.sa-reveal\.is-visible/);
    expect(css).toMatch(/\.sa-reveal-item/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
