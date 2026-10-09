import { describe, expect, it } from "vitest";
import {
  aboutFeaturesAsHomepageSections,
  aboutHasContent,
  aboutHeroConfig,
  aboutJourneyCards,
  aboutJourneyTrust,
  aboutMembersAsFounders,
  defaultAboutSection,
  isAboutPagePublished,
  mergeAboutSection,
} from "./aboutUs";
import { mergeSparkAcademyLandingConfig } from "./brandLandingDefaults";

describe("aboutUs", () => {
  it("defaultAboutSection_includes_mastermind_style_structure", () => {
    const about = defaultAboutSection("BrightMind");
    expect(about.title).toContain("BRIGHTMIND");
    expect(about.features).toHaveLength(4);
    expect(about.publishPage).toBe(true);
    expect(about.members).toEqual([]);
  });

  it("aboutHasContent_requires_meaningful_fields", () => {
    expect(aboutHasContent(undefined)).toBe(false);
    expect(aboutHasContent({ features: [], members: [] })).toBe(false);
    expect(aboutHasContent({ title: "About us", features: [], members: [] })).toBe(true);
    expect(
      aboutHasContent({
        features: [{ id: "1", title: "Research", body: "" }],
        members: [],
      })
    ).toBe(true);
  });

  it("isAboutPagePublished_respects_publish_flag", () => {
    const about = defaultAboutSection("X");
    expect(isAboutPagePublished(about)).toBe(true);
    expect(isAboutPagePublished({ ...about, publishPage: false })).toBe(false);
    expect(isAboutPagePublished({ features: [], members: [], publishPage: true })).toBe(false);
  });

  it("mergeAboutSection_keeps_custom_members_and_features", () => {
    const merged = mergeAboutSection("Brand", {
      title: "Custom",
      features: [{ id: "a", title: "A", body: "B" }],
      members: [{ id: "m1", name: "Naveen", role: "Director", photoUrl: "https://example.com/a.jpg" }],
      publishPage: true,
    });
    expect(merged.title).toBe("Custom");
    expect(merged.features).toHaveLength(1);
    expect(merged.members[0]?.name).toBe("Naveen");
  });

  it("aboutFeaturesAsHomepageSections_maps_differentiators", () => {
    const about = defaultAboutSection("BrightMind");
    const items = aboutFeaturesAsHomepageSections(about);
    expect(items).toHaveLength(4);
    expect(items[0]?.title).toBe("We Research");
    expect(items[0]?.titleSerif).toBe("");
  });

  it("aboutJourneyCards_uses_first_short_paragraph_as_title", () => {
    const about = defaultAboutSection("BrightMind");
    const cards = aboutJourneyCards(about);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.title).toBe("Striving to Educate, Not Just Teach");
    expect(cards[0]?.subtitle).toContain("BrightMind");
  });

  it("aboutMembersAsFounders_maps_photo_name_role", () => {
    const founders = aboutMembersAsFounders([
      { id: "1", name: "Naveen Chowdhari", role: "Director", photoUrl: "https://example.com/n.jpg" },
    ]);
    expect(founders[0]).toMatchObject({
      name: "Naveen Chowdhari",
      title: "",
      roleBadge: "Director",
      photoUrl: "https://example.com/n.jpg",
    });
  });

  it("aboutHeroConfig_puts_about_copy_on_spark_hero_block", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    const about = defaultAboutSection("Spark Brand");
    const hero = aboutHeroConfig(config, about).hero;
    expect(hero.badge).toBe("");
    // Stock Mastermind headline keeps homepage navy + blue title colours.
    expect(hero.line1).toBe(config.hero.line1);
    expect(hero.line1Serif).toBe(config.hero.line1Serif);
    expect(hero.line2).toBe(config.hero.line2);
    expect(hero.subtitle).toContain("brain development");
    expect(hero.ctaLabel).toBe("Book a free demo");
  });

  it("regression_about_hero_keeps_homepage_highlight_colours_for_stock_headline", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    const about = defaultAboutSection("Spark Brand");
    const hero = aboutHeroConfig(config, about).hero;
    expect(hero.line1Serif?.trim()).toBeTruthy();
    expect(hero.line1Serif).toBe(config.hero.line1Serif);
  });

  it("regression_about_custom_headline_uses_blue_highlight_on_last_word", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    const about = {
      ...defaultAboutSection("Spark Brand"),
      heroHeadline: "We build confident learners",
    };
    const hero = aboutHeroConfig(config, about).hero;
    expect(hero.line1).toBe("We build confident");
    expect(hero.line1Serif).toBe("learners");
    expect(hero.line2).toBe("");
  });

  it("aboutHeroConfig_uses_about_hero_image_when_uploaded", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    const about = {
      ...defaultAboutSection("Spark Brand"),
      heroImageUrl: "https://example.com/about-hero.jpg",
    };
    expect(aboutHeroConfig(config, about).hero.backgroundImageUrl).toBe(
      "https://example.com/about-hero.jpg"
    );
  });

  it("aboutJourneyTrust_uses_philosophy_image_when_uploaded", () => {
    const config = mergeSparkAcademyLandingConfig("Spark Brand");
    const about = {
      ...defaultAboutSection("Spark Brand"),
      philosophyImageUrl: "https://example.com/about-philosophy.jpg",
    };
    expect(aboutJourneyTrust(about, config.trustMedia)?.imageUrl).toBe(
      "https://example.com/about-philosophy.jpg"
    );
  });
});
