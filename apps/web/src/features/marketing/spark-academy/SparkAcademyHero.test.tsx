import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { mergeSparkAcademyLandingConfig } from "@/lib/brandLandingDefaults";
import { createPublicCurriculumProgram } from "@/lib/brandCurriculumPublic";
import { SparkAcademyHero, buildHeroStats } from "./SparkAcademyHero";

describe("SparkAcademyHero", () => {
  it("regression_renders_rounded_stats_bar_with_dot_separators", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(<SparkAcademyHero config={config} programCount={0} />);

    expect(document.querySelector(".sa-hero__stats-bar")).toBeDefined();
    expect(document.querySelectorAll(".sa-hero__stats-dot")).toHaveLength(3);
    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("Satisfaction rate")).toBeDefined();
    expect(screen.getByText("12+")).toBeDefined();
    expect(screen.getByText("Years of experience")).toBeDefined();
    expect(screen.getByText("20k+")).toBeDefined();
    expect(screen.getByText("Total Courses")).toBeDefined();
    expect(screen.getByText("90+")).toBeDefined();
    expect(screen.getByText("Course Category")).toBeDefined();
  });

  it("shows manual learner count float card when brandStats.studentCount is set", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    config.footer.rich = {
      ...config.footer.rich!,
      brandStats: { studentCount: "8k+" },
    };
    render(<SparkAcademyHero config={config} programCount={0} />);
    expect(screen.getByText("8k+")).toBeDefined();
    expect(screen.getByText("Learners")).toBeDefined();
  });

  it("regression_spark_hero_uses_hero_cta_not_nav", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    config.nav.ctaLabel = "Nav enroll";
    config.nav.ctaHref = "enroll";
    config.hero.ctaLabel = "Start learning";
    config.hero.ctaHref = "enroll";
    render(<SparkAcademyHero config={config} programCount={0} />);
    expect(screen.getByRole("link", { name: "Start learning" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Nav enroll" })).toBeNull();
  });

  it("regression_spark_hero_course_float_anchors_to_photo_stage", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    config.footer.rich = {
      ...config.footer.rich!,
      brandStats: { studentCount: "5k+" },
    };
    const { container } = render(
      <SparkAcademyHero
        config={config}
        featuredProgram={createPublicCurriculumProgram({ name: "Abacus" })}
        programCount={1}
      />
    );

    const stage = container.querySelector(".sa-hero__photo-stage");
    expect(stage).toBeDefined();
    expect(stage?.querySelector(".sa-hero__float-card--course")).toBeDefined();
    expect(stage?.querySelector(".sa-hero__float-card--stat")).toBeDefined();
    expect(screen.getByText("Course")).toBeDefined();
    expect(screen.getByText("Abacus")).toBeDefined();
  });

  it("regression_spark_homepage_hero_keeps_overlays_when_showOverlays_default", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    config.hero.badge = "FOR AGED 6–14 YEARS";
    render(
      <SparkAcademyHero
        config={config}
        featuredProgram={createPublicCurriculumProgram({ name: "Abacus" })}
        programCount={1}
      />
    );
    expect(screen.getByText("FOR AGED 6–14 YEARS")).toBeDefined();
    expect(document.querySelector(".sa-hero__stats")).toBeTruthy();
    expect(document.querySelector(".sa-hero__float-card--course")).toBeTruthy();
  });

  it("hides_badge_floats_and_stats_when_showOverlays_false", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    config.hero.badge = "FOR AGED 6–14 YEARS";
    render(
      <SparkAcademyHero
        config={config}
        featuredProgram={createPublicCurriculumProgram({ name: "Abacus" })}
        showOverlays={false}
      />
    );
    expect(screen.queryByText("FOR AGED 6–14 YEARS")).toBeNull();
    expect(document.querySelector(".sa-hero__badge")).toBeNull();
    expect(document.querySelector(".sa-hero__float-card")).toBeNull();
    expect(document.querySelector(".sa-hero__stats")).toBeNull();
  });
});

describe("buildHeroStats", () => {
  it("uses custom stats when four are configured", () => {
    const config = mergeSparkAcademyLandingConfig("Test");
    const stats = buildHeroStats(config, 0);
    expect(stats).toHaveLength(4);
    expect(stats[0]).toEqual({ value: "100%", label: "Satisfaction rate" });
  });

  it("replaces course count when programs exist", () => {
    const config = mergeSparkAcademyLandingConfig("Test");
    config.footer.rich!.customStats = [];
    const stats = buildHeroStats(config, 15);
    expect(stats.find((s) => s.label === "Total Courses")?.value).toBe("15+");
  });

  it("regression_total_courses_respects_editor_custom_stats", () => {
    const config = mergeSparkAcademyLandingConfig("Test");
    config.footer.rich!.customStats = (config.footer.rich!.customStats ?? []).map((s) =>
      s.label === "Total Courses" ? { ...s, value: "4k" } : s
    );
    const stats = buildHeroStats(config, 1);
    expect(stats.find((s) => s.label === "Total Courses")?.value).toBe("4k");
    expect(stats.find((s) => s.label === "Course Category")?.value).toBe("90+");
  });
});
