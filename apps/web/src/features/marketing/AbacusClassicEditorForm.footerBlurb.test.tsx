import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { mergeSparkAcademyLandingConfig } from "@/lib/brandLandingDefaults";
import { AbacusClassicEditorForm } from "./AbacusClassicEditorForm";

describe("AbacusClassicEditorForm footer blurb", () => {
  it("regression_footer_blurb_edited_under_site_near_logo", () => {
    const config = mergeSparkAcademyLandingConfig("Smart Brain");
    const onChange = vi.fn();

    render(
      <AbacusClassicEditorForm
        config={config}
        marketingTheme="spark-academy"
        onChange={onChange}
        portalMode="brand"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Site/i }));
    expect(screen.getByLabelText("Footer blurb under logo")).toBeDefined();
    expect(screen.queryByLabelText("Brand description")).toBeNull();
    expect(document.querySelector(".ed-homepage-editor-site-blurb")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Footer blurb under logo"), {
      target: { value: "Trusted abacus franchise network across India." },
    });

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0] as typeof config;
    expect(next.footer.rich?.description).toBe("Trusted abacus franchise network across India.");

    fireEvent.click(screen.getByRole("button", { name: /Footer/i }));
    expect(screen.getByText(/Footer logo blurb is edited under/i)).toBeDefined();
    expect(screen.getByText("Hero stats bar")).toBeDefined();
  });
});
