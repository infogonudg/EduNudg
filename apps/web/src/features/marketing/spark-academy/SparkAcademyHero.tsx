import { Fragment } from "react";
import type { HomepageConfig } from "@/types/homepage";
import type { PublicCurriculumProgram } from "@/lib/brandCurriculumPublic";
import { MarketingBackgroundMedia } from "../MarketingBackgroundMedia";
import { SparkAcademyCta } from "./SparkAcademyCta";

type Props = {
  config: HomepageConfig;
  featuredProgram?: PublicCurriculumProgram | null;
  programCount?: number;
  /** Section id; `/about` uses `about-hero` so homepage `#hero` still targets `/`. */
  id?: string;
  /**
   * Homepage keeps the ABOUT badge, course/learner floats, and stats bar.
   * `/about` passes false so those overlays stay homepage-only.
   */
  showOverlays?: boolean;
};

const HERO_STAT_FALLBACKS: { value: string; label: string }[] = [
  { value: "100%", label: "Satisfaction rate" },
  { value: "12+", label: "Years of experience" },
  { value: "20k+", label: "Total Courses" },
  { value: "90+", label: "Course Category" },
];

function buildHeroStats(
  config: HomepageConfig,
  programCount = 0
): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];

  for (const custom of config.footer.rich?.customStats ?? []) {
    if (custom.value.trim() && custom.label.trim()) {
      stats.push({ value: custom.value.trim(), label: custom.label.trim() });
    }
  }

  if (stats.length < 4) {
    const fallbacks = HERO_STAT_FALLBACKS.map((item, index) => {
      if (index === 2 && programCount > 0) {
        return { value: `${programCount}+`, label: item.label };
      }
      return item;
    });

    for (const fb of fallbacks) {
      if (stats.length >= 4) break;
      if (!stats.some((s) => s.label === fb.label)) stats.push(fb);
    }
  }

  while (stats.length < 4) {
    for (const fb of HERO_STAT_FALLBACKS) {
      if (stats.length >= 4) break;
      if (!stats.some((s) => s.label === fb.label)) stats.push(fb);
    }
    break;
  }

  // Editor customStats win. Live curriculum count only fills Total Courses when that
  // label was not configured (fallback path above).
  return stats.slice(0, 4);
}

export function SparkAcademyHero({
  config,
  featuredProgram,
  programCount = 0,
  id = "hero",
  showOverlays = true,
}: Props) {
  const hero = config.hero;
  const stats = buildHeroStats(config, programCount);
  const heroImage = hero.backgroundImageUrl?.trim() || hero.phoneFrameUrl?.trim() || "";
  const studentDisplay = config.footer.rich?.brandStats?.studentCount?.trim();

  return (
    <section className="sa-hero" id={id}>
      <div className="sa-hero__inner">
        <div className="sa-hero__copy">
          {showOverlays && hero.badge ? <span className="sa-hero__badge">{hero.badge}</span> : null}
          <h1 className="sa-hero__title">
            {hero.line1}{" "}
            {hero.line1Serif ? <span className="sa-hero__highlight">{hero.line1Serif}</span> : null}
            {hero.line2 || hero.line2Serif ? (
              <>
                <br />
                {hero.line2}{" "}
                {hero.line2Serif ? <span className="sa-hero__highlight">{hero.line2Serif}</span> : null}
              </>
            ) : null}
          </h1>
          <p className="sa-hero__subtitle">{hero.subtitle}</p>
          <SparkAcademyCta
            label={hero.ctaLabel || config.nav.ctaLabel}
            href={hero.ctaHref || config.nav.ctaHref}
            variant="dark"
            showArrow
            className="sa-hero__cta"
          />
        </div>

        <div className="sa-hero__visual">
          <div className="sa-hero__visual-bg" aria-hidden />
          <div className="sa-hero__photo-stage">
            {heroImage ? (
              <div className="sa-hero__photo-wrap">
                <MarketingBackgroundMedia src={heroImage} />
              </div>
            ) : (
              <div className="sa-hero__photo-placeholder" aria-hidden />
            )}
            {showOverlays && featuredProgram ? (
              <div className="sa-hero__float-card sa-hero__float-card--course">
                <span className="sa-hero__float-label">Course</span>
                <strong>{featuredProgram.name}</strong>
              </div>
            ) : null}
            {showOverlays && studentDisplay ? (
              <div className="sa-hero__float-card sa-hero__float-card--stat">
                <strong>{studentDisplay}</strong>
                <span>Learners</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showOverlays ? (
        <div className="sa-hero__stats">
          <div className="sa-hero__stats-bar">
            {stats.map((stat, i) => (
              <Fragment key={`${stat.label}-${i}`}>
                {i > 0 ? <span className="sa-hero__stats-dot" aria-hidden /> : null}
                <div className="sa-hero__stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { buildHeroStats };
