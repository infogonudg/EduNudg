import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Spark Academy heading type scale", () => {
  const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");

  it("regression_spark_section_headings_share_type_scale", () => {
    expect(css).toMatch(/--sa-heading-font:\s*Inter,/);
    expect(css).toMatch(/--sa-h2-size:\s*clamp\(1\.75rem, 4vw, 2\.25rem\)/);
    expect(css).toMatch(/--sa-h2-weight:\s*800/);
    expect(css).toMatch(/--sa-h3-size:\s*1\.0625rem/);
    expect(css).toMatch(
      /\.sa-section-title,\s*\.sa-features__title,\s*\.sa-journey__title,\s*\.sa-mentors__title,\s*\.sa-testimonials__title/
    );
    expect(css).toMatch(/font-size:\s*var\(--sa-h2-size\)/);
    expect(css).toMatch(/\.marketing-page--spark-academy \.about-us__section-title/);
    expect(css).toMatch(/\.marketing-page--spark-academy \.mkt-events__title/);
    expect(css).not.toMatch(/\.sa-journey__title\s*\{[^}]*font-size:\s*clamp/s);
    expect(css).not.toMatch(/\.sa-mentors__title\s*\{[^}]*font-size:\s*clamp/s);
    expect(css).not.toMatch(/\.sa-testimonials__title\s*\{[^}]*font-size:\s*clamp/s);
    expect(css).not.toMatch(/\.sa-features__title\s*\{[^}]*font-size:\s*clamp/s);
  });
});

describe("Spark Academy course page canvas", () => {
  const css = readFileSync(resolve(__dirname, "spark-academy.css"), "utf8");

  it("regression_spark_course_page_uses_courses_section_background", () => {
    expect(css).toMatch(/--sa-page:\s*#f8fafc/);
    expect(css).toMatch(/\.marketing-page\.marketing-page--spark-academy,\s*\.sa-nav__drawer\s*\{[^}]*background:\s*#fff/s);
    expect(css).toMatch(/\.sa-courses\s*\{[^}]*background:\s*var\(--sa-page\)/s);
    expect(css).toMatch(/\.sa-course-detail\s*\{[^}]*background:\s*var\(--sa-page\)/s);
    expect(css).toMatch(
      /html:has\(\.marketing-page--spark-academy \.sa-course-detail\),\s*body:has\(\.marketing-page--spark-academy \.sa-course-detail\)\s*\{[^}]*background:\s*#f8fafc/s
    );
    expect(css).toMatch(
      /\.marketing-page\.marketing-page--spark-academy:has\(\.sa-course-detail\)\s*\{[^}]*background:\s*var\(--sa-page\)/s
    );
  });

  it("regression_spark_course_card_photo_css_shows_full_banner", () => {
    // Shared 16:9 frame; contain keeps the full banner (not a cropped cover).
    expect(css).toMatch(/\.sa-course-card__media\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
    expect(css).toMatch(/\.sa-course-card__photo\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.sa-course-card__photo\s*\{[^}]*height:\s*100%/s);
    expect(css).not.toMatch(/\.sa-course-card__media--image\s*\{[^}]*height:\s*auto/s);
  });
});
