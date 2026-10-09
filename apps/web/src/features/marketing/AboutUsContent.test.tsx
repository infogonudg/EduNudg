import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AboutUsHomepageSection, AboutUsPageContent } from "./AboutUsContent";
import {
  mergeAbacusClassicLandingConfig,
  mergeSparkAcademyLandingConfig,
} from "@/lib/brandLandingDefaults";
import { setSectionEnabled, ABACUS_CLASSIC_SECTION_DEFAULTS } from "@/lib/homepageSections";

describe("AboutUsContent", () => {
  it("renders_mastermind_style_team_grid_with_photo_name_role", () => {
    let config = mergeAbacusClassicLandingConfig("Master Demo");
    config = {
      ...config,
      about: {
        ...config.about!,
        members: [
          {
            id: "1",
            name: "Naveen Chowdhari",
            role: "Director",
            photoUrl: "https://example.com/naveen.jpg",
          },
          {
            id: "2",
            name: "Rajesh Jha",
            role: "Vice President",
            photoUrl: "",
          },
        ],
      },
    };

    render(
      <MemoryRouter>
        <AboutUsPageContent config={config} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /ABOUT MASTER DEMO/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /WHAT MAKES US DIFFERENT/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Naveen Chowdhari" })).toBeDefined();
    expect(screen.getByText("Director")).toBeDefined();
    expect(screen.getByRole("img", { name: "Naveen Chowdhari" }).getAttribute("src")).toBe(
      "https://example.com/naveen.jpg"
    );
    expect(document.querySelector(".about-us__member-photo--placeholder")).toBeDefined();
  });

  it("homepage_teaser_links_to_about_page", () => {
    const config = mergeAbacusClassicLandingConfig("Teaser Brand");
    render(
      <MemoryRouter>
        <AboutUsHomepageSection config={config} showPageLink />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /Read our full story/i }).getAttribute("href")).toBe(
      "/about"
    );
  });

  it("regression_about_homepage_section_respects_toggle_default_off", () => {
    const config = mergeAbacusClassicLandingConfig("Toggle Brand");
    expect(config.sections?.about).toBe(false);
    const enabled = setSectionEnabled(config, "about", true, ABACUS_CLASSIC_SECTION_DEFAULTS);
    expect(enabled.sections?.about).toBe(true);
  });

  it("regression_spark_about_page_uses_spark_theme_modifier", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Demo");
    const { container } = render(
      <MemoryRouter>
        <AboutUsPageContent config={config} marketingTheme="spark-academy" useLeadModals />
      </MemoryRouter>
    );
    expect(container.querySelector("main.sa-about.sa-main")).toBeTruthy();
    expect(container.querySelector("#about-hero.sa-hero")).toBeTruthy();
    expect(container.querySelector(".sa-features")).toBeTruthy();
    expect(container.querySelector(".sa-journey")).toBeTruthy();
    expect(container.querySelector(".about-us--spark-academy")).toBeNull();
    expect(container.querySelector(".sa-btn")).toBeTruthy();
    expect(container.querySelector(".sa-hero__badge")).toBeNull();
    expect(screen.queryByText("About us")).toBeNull();
  });

  it("regression_about_single_team_photo_spans_content_width", () => {
    const config = {
      ...mergeAbacusClassicLandingConfig("Team Brand"),
      about: {
        ...mergeAbacusClassicLandingConfig("Team Brand").about!,
        members: [
          {
            id: "1",
            name: "Leadership team",
            role: "HQ",
            photoUrl: "https://example.com/group.jpg",
          },
        ],
      },
    };

    render(
      <MemoryRouter>
        <AboutUsPageContent config={config} />
      </MemoryRouter>
    );

    expect(document.querySelector(".about-us__team-banner-photo")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Leadership team" }).getAttribute("src")
    ).toBe("https://example.com/group.jpg");
    expect(document.querySelector(".about-us__team-grid")).toBeNull();
  });
});
