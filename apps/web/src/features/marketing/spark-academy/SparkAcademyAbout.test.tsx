import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { LeadModalProvider } from "@/features/marketing/abacus-classic/LeadModalContext";
import { mergeSparkAcademyLandingConfig } from "@/lib/brandLandingDefaults";
import { SparkAcademyAbout } from "./SparkAcademyAbout";

function renderAbout(config = mergeSparkAcademyLandingConfig("Spark Brand")) {
  return render(
    <MemoryRouter>
      <LeadModalProvider>
        <SparkAcademyAbout config={config} />
      </LeadModalProvider>
    </MemoryRouter>
  );
}

describe("SparkAcademyAbout", () => {
  it("regression_spark_about_page_uses_homepage_section_blocks", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    config.about = {
      ...config.about!,
      members: [
        {
          id: "1",
          name: "Naveen Chowdhari",
          role: "Director",
          photoUrl: "https://example.com/naveen.jpg",
        },
      ],
    };

    renderAbout(config);

    expect(document.querySelector("main.sa-about.sa-main")).toBeTruthy();
    expect(document.querySelector("#about-hero.sa-hero")).toBeTruthy();
    expect(document.querySelector("#about-features.sa-features")).toBeTruthy();
    expect(document.querySelector("#about-journey.sa-journey")).toBeTruthy();
    expect(document.querySelector("#about-team.sa-mentors")).toBeTruthy();

    expect(document.querySelector("#about-hero .sa-hero__title")).toBeTruthy();
    expect(document.querySelector("#about-hero .sa-hero__highlight")).toBeTruthy();
    expect(screen.getByText("We Research")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Our Endeavour" })).toBeDefined();
    expect(screen.getByText("Naveen Chowdhari")).toBeDefined();
    expect(screen.getByText("Director")).toBeDefined();
    expect(document.querySelector("#about-team.sa-mentors--team")).toBeTruthy();
    expect(document.querySelector(".sa-btn")).toBeTruthy();

    expect(document.querySelector(".about-us")).toBeNull();
    expect(document.querySelector(".about-us__hero")).toBeNull();
    expect(document.querySelector(".about-us__cta-band")).toBeNull();
    expect(document.querySelector(".about-us__feature-index")).toBeNull();
    expect(document.querySelector("#hero")).toBeNull();
    expect(document.querySelector("#features")).toBeNull();
    expect(document.querySelector("#founders")).toBeNull();
  });

  it("regression_spark_about_page_uses_spark_theme_classes", () => {
    renderAbout();
    expect(document.querySelector("main.sa-about")).toBeTruthy();
    expect(document.querySelector(".sa-hero")).toBeTruthy();
    expect(document.querySelector(".sa-btn")).toBeTruthy();
    expect(document.querySelector(".about-us--spark-academy")).toBeNull();
  });

  it("regression_spark_about_hero_omits_homepage_badges", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    config.about = {
      ...config.about!,
      heroImageUrl: "https://example.com/about-hero.jpg",
    };
    config.footer.rich = {
      ...config.footer.rich!,
      brandStats: { studentCount: "5k+" },
    };

    renderAbout(config);

    expect(document.querySelector(".sa-hero__badge")).toBeNull();
    expect(screen.queryByText("About us")).toBeNull();
    expect(document.querySelector(".sa-hero__float-card")).toBeNull();
    expect(document.querySelector(".sa-hero__stats")).toBeNull();
    expect(screen.queryByText("Course")).toBeNull();
    expect(screen.queryByText("Learners")).toBeNull();
    expect(screen.queryByText("Satisfaction rate")).toBeNull();
  });

  it("regression_spark_about_features_omits_float_badges", () => {
    renderAbout();
    expect(document.querySelector("#about-features .sa-features__float")).toBeNull();
    expect(screen.queryByText("Last month")).toBeNull();
    expect(screen.queryByText("Learning Progress")).toBeNull();
  });

  it("uses_about_hero_and_philosophy_uploads_on_about_page", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    config.about = {
      ...config.about!,
      heroImageUrl: "https://example.com/about-hero.jpg",
      philosophyImageUrl: "https://example.com/about-philosophy.jpg",
    };

    renderAbout(config);

    expect(
      document.querySelector("#about-hero img")?.getAttribute("src")
    ).toBe("https://example.com/about-hero.jpg");
    expect(
      document.querySelector("#about-journey img")?.getAttribute("src")
    ).toBe("https://example.com/about-philosophy.jpg");
  });

  it("regression_spark_about_hero_keeps_homepage_title_colours", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    renderAbout(config);

    const highlight = document.querySelector("#about-hero .sa-hero__highlight");
    expect(highlight).toBeTruthy();
    expect(highlight?.textContent?.trim()).toBe(config.hero.line1Serif?.trim());
  });

  it("regression_spark_about_team_uses_full_bleed_photo_layout", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    config.about = {
      ...config.about!,
      members: [
        {
          id: "1",
          name: "Our leadership",
          role: "",
          photoUrl: "https://example.com/group.jpg",
        },
      ],
    };

    renderAbout(config);

    expect(document.querySelector("#about-team.sa-mentors--team")).toBeTruthy();
    expect(document.querySelector(".sa-mentors__team-bleed--single")).toBeTruthy();
  });
});
