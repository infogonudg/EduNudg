import type { HomepageConfig } from "@/types/homepage";
import { visiblePublicFounders } from "@/lib/centerLandingDefaults";
import {
  aboutFeaturesAsHomepageSections,
  aboutFeaturesShowcase,
  aboutHasContent,
  aboutHeroConfig,
  aboutJourneyTrust,
  aboutMembersAsFounders,
  mergeAboutSection,
} from "@/lib/aboutUs";
import { useScrollReveal } from "../useScrollReveal";
import { SparkAcademyHero } from "./SparkAcademyHero";
import { FeaturesSection } from "./FeaturesSection";
import { JourneySection } from "./JourneySection";
import { MentorsSection } from "./MentorsSection";

type Props = {
  config: HomepageConfig;
};

/**
 * Spark `/about` — same Hero / Features / Journey / Mentors blocks as `/`,
 * filled with `landing.about` copy (no Mastermind-only About chrome).
 */
export function SparkAcademyAbout({ config }: Props) {
  if (!aboutHasContent(config.about)) return null;

  const about = mergeAboutSection(config.meta.siteName || "Our brand", config.about);
  const heroConfig = aboutHeroConfig(config, about);
  const featureItems = aboutFeaturesAsHomepageSections(about);
  const showcase = aboutFeaturesShowcase(about, config.featuresShowcase);
  const journey = aboutJourneyTrust(about, config.trustMedia);
  const aboutTeam = aboutMembersAsFounders(about.members);
  const usingAboutMembers = aboutTeam.length > 0;
  const team = usingAboutMembers ? aboutTeam : visiblePublicFounders(config.founders);
  const featureImageFallback =
    about.imageUrl?.trim() ||
    config.featuresShowcase?.imageUrl?.trim() ||
    config.hero.backgroundImageUrl?.trim() ||
    "";

  useScrollReveal(true, ".sa-reveal", { threshold: 0.16, rootMargin: "0px 0px -12% 0px" });

  return (
    <main className="sa-main sa-about">
      <SparkAcademyHero
        config={heroConfig}
        featuredProgram={null}
        programCount={0}
        id="about-hero"
        showOverlays={false}
      />

      {featureItems.length > 0 ? (
        <FeaturesSection
          sections={featureItems}
          showcase={showcase}
          imageUrlFallback={featureImageFallback || undefined}
          id="about-features"
          showFloats={false}
        />
      ) : null}

      {journey ? (
        <JourneySection
          trust={journey}
          rich={config.footer.rich}
          highlightFounder={team[0] ?? null}
          id="about-journey"
        />
      ) : null}

      {team.length > 0 ? (
        <MentorsSection
          founders={team}
          eyebrow="Our Team"
          title={about.teamTitle?.trim() || "Meet Our Expert Mentors"}
          subtitle=""
          id="about-team"
          layout={usingAboutMembers ? "team" : "mentors"}
        />
      ) : null}
    </main>
  );
}
