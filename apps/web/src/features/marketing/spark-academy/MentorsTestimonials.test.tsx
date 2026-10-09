import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { mergeSparkAcademyLandingConfig } from "@/lib/brandLandingDefaults";
import { MentorsSection } from "./MentorsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import {
  SPARK_TESTIMONIALS_AUTOSCROLL_MS,
  nextCarouselIndex,
  parseTestimonialAuthor,
  shouldAutoScrollTestimonials,
} from "./testimonialHelpers";

describe("MentorsSection", () => {
  it("regression_renders_badge_title_and_horizontal_track", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(<MentorsSection founders={config.founders!} />);

    expect(screen.getByText("Our Mentors")).toBeDefined();
    expect(screen.getByText("Meet Our Expert Mentors")).toBeDefined();
    expect(screen.getByText(/Learn from the best in the industry/)).toBeDefined();
    expect(screen.getByText("Sarah Johnson")).toBeDefined();
    expect(screen.getByText("AI Expert & Data Scientist")).toBeDefined();
    expect(document.querySelector(".sa-mentors__track")).toBeDefined();
    expect(document.querySelector(".sa-mentors__track--center")).toBeDefined();
    expect(document.querySelector(".sa-mentors")).toBeDefined();
  });

  it("regression_spark_mentors_center_in_track", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(<MentorsSection founders={[config.founders![0]]} />);

    expect(document.querySelector(".sa-mentors__track--center")).toBeDefined();
    expect(screen.getByText("Sarah Johnson")).toBeDefined();
  });

  it("regression_spark_mentor_card_shows_role_badge_and_title", () => {
    render(
      <MentorsSection
        founders={[
          {
            roleBadge: "FOUNDER & CEO",
            name: "Bhavana Soni",
            title: "Smart Brain Abacus Education Pvt. Ltd.",
            bio: "Share your story.",
            photoUrl: "",
          },
        ]}
      />
    );

    expect(screen.getByText("FOUNDER & CEO")).toBeDefined();
    expect(screen.getByText("Bhavana Soni")).toBeDefined();
    expect(screen.getByText("Smart Brain Abacus Education Pvt. Ltd.")).toBeDefined();
    expect(document.querySelector(".sa-mentor-card__badge")).toBeDefined();
  });

  it("regression_spark_mentor_card_does_not_duplicate_role_as_title", () => {
    render(
      <MentorsSection
        founders={[
          {
            roleBadge: "Director",
            name: "Naveen Chowdhari",
            title: "Director",
            bio: "",
            photoUrl: "",
          },
        ]}
      />
    );

    expect(screen.getAllByText("Director")).toHaveLength(1);
  });

  it("regression_about_team_photo_spans_full_bleed_width", () => {
    render(
      <MentorsSection
        layout="team"
        eyebrow="Our Team"
        title="OUR TEAM"
        subtitle=""
        id="about-team"
        founders={[
          {
            roleBadge: "",
            name: "Leadership team",
            title: "",
            bio: "",
            photoUrl: "https://example.com/team-group.jpg",
          },
        ]}
      />
    );

    expect(document.querySelector(".sa-mentors--team")).toBeTruthy();
    expect(document.querySelector(".sa-mentors__team-bleed--single")).toBeTruthy();
    expect(document.querySelector(".sa-mentors__track")).toBeNull();
    expect(
      document.querySelector(".sa-mentors__team-media img")?.getAttribute("src")
    ).toBe("https://example.com/team-group.jpg");
  });

  it("regression_about_team_photos_do_not_crop_heads_with_cover", () => {
    const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");
    const gridImg = css.match(
      /\.sa-mentors--team \.sa-mentors__team-bleed--grid \.sa-mentors__team-media img[\s\S]*?\{[\s\S]*?\}/
    )?.[0];
    expect(gridImg).toBeTruthy();
    expect(gridImg).toMatch(/object-fit:\s*contain/);
    expect(gridImg).not.toMatch(/object-fit:\s*cover/);
    expect(css).toMatch(
      /\.sa-mentors--team \.sa-mentors__team-bleed--grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill/s
    );
    expect(css).not.toMatch(
      /\.sa-mentors--team[\s\S]*?aspect-ratio:\s*16\s*\/\s*9/
    );
  });

  it("regression_about_team_multiple_photos_render_side_by_side_grid", () => {
    render(
      <MentorsSection
        layout="team"
        eyebrow="Our Team"
        title="OUR TEAM"
        subtitle=""
        id="about-team"
        founders={Array.from({ length: 10 }, (_, i) => ({
          roleBadge: "",
          name: `Member ${i + 1}`,
          title: "",
          bio: "",
          photoUrl: `https://example.com/team-${i + 1}.jpg`,
        }))}
      />
    );

    expect(document.querySelector(".sa-mentors__team-bleed--grid")).toBeTruthy();
    expect(document.querySelector(".sa-mentors__team-bleed--single")).toBeNull();
    expect(document.querySelectorAll(".sa-mentors__team-figure")).toHaveLength(10);
  });
});

describe("TestimonialsSection", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("regression_renders_badge_grid_and_author_roles", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(<TestimonialsSection testimonials={config.testimonials} />);

    expect(screen.getByText("Our Feedbacks")).toBeDefined();
    expect(screen.getByText("What Our Learners Are Saying")).toBeDefined();
    expect(screen.getByText(/Hear directly from our students/)).toBeDefined();
    expect(screen.getByText("John Matthews")).toBeDefined();
    expect(screen.getByText("Product Designer")).toBeDefined();
    expect(document.querySelectorAll(".sa-testimonial-card")).toHaveLength(6);
    expect(document.querySelector(".sa-testimonials__grid--center")).toBeDefined();
    expect(document.querySelector(".sa-testimonials__carousel")).toBeDefined();
  });

  it("regression_spark_testimonials_mobile_carousel_markup", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(
      <TestimonialsSection
        testimonials={{ ...config.testimonials, title: "Success stories" }}
      />
    );

    const track = document.querySelector(".sa-testimonials__carousel");
    expect(track).toBeDefined();
    expect(track?.getAttribute("role")).toBe("region");
    expect(track?.getAttribute("aria-roledescription")).toBe("carousel");
    expect(track?.getAttribute("aria-label")).toBe("Success stories");
  });

  it("regression_spark_testimonials_mobile_autoscroll_advances", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("767px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(<TestimonialsSection testimonials={config.testimonials} />);
    const track = document.querySelector(".sa-testimonials__carousel") as HTMLElement;
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo;

    vi.advanceTimersByTime(SPARK_TESTIMONIALS_AUTOSCROLL_MS);
    expect(scrollTo).toHaveBeenCalled();
  });

  it("regression_spark_testimonials_center_in_grid", () => {
    const config = mergeSparkAcademyLandingConfig("Digitley");
    render(
      <TestimonialsSection
        testimonials={{
          ...config.testimonials,
          title: "Success stories",
          items: config.testimonials.items.slice(0, 1),
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Success stories" })).toBeDefined();
    expect(document.querySelector(".sa-testimonials__grid--center")).toBeDefined();
    expect(document.querySelectorAll(".sa-testimonial-card")).toHaveLength(1);
  });
});

describe("testimonial carousel helpers", () => {
  it("regression_spark_testimonials_auto_scroll_advances_index", () => {
    expect(nextCarouselIndex(0, 3)).toBe(1);
    expect(nextCarouselIndex(2, 3)).toBe(0);
    expect(nextCarouselIndex(0, 1)).toBe(0);
  });

  it("regression_spark_testimonials_auto_scroll_skips_reduced_motion", () => {
    expect(
      shouldAutoScrollTestimonials({ isMobile: true, prefersReducedMotion: true, itemCount: 4 })
    ).toBe(false);
    expect(
      shouldAutoScrollTestimonials({ isMobile: false, prefersReducedMotion: false, itemCount: 4 })
    ).toBe(false);
    expect(
      shouldAutoScrollTestimonials({ isMobile: true, prefersReducedMotion: false, itemCount: 1 })
    ).toBe(false);
    expect(
      shouldAutoScrollTestimonials({ isMobile: true, prefersReducedMotion: false, itemCount: 4 })
    ).toBe(true);
  });
});

describe("Spark testimonials carousel CSS", () => {
  const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");

  it("regression_spark_testimonials_mobile_carousel_css", () => {
    expect(css).toMatch(/@media \(max-width: 767px\)/);
    expect(css).toMatch(/\.sa-testimonials__carousel\s*\{[^}]*scroll-snap-type:\s*x mandatory/s);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});

describe("parseTestimonialAuthor", () => {
  it("uses explicit role when provided", () => {
    expect(parseTestimonialAuthor({ quote: "Great", author: "Jane Doe", role: "Designer" })).toEqual({
      name: "Jane Doe",
      role: "Designer",
    });
  });

  it("parses author with middle dot separator", () => {
    expect(parseTestimonialAuthor({ quote: "Great", author: "Jane Doe · Designer" })).toEqual({
      name: "Jane Doe",
      role: "Designer",
    });
  });
});
