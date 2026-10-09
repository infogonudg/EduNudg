import { Link } from "react-router-dom";
import type { HomepageAboutSection, HomepageConfig, MarketingTheme } from "@/types/homepage";
import { aboutUsThemeClass } from "@/lib/marketingThemeLayout";
import { aboutHasContent, mergeAboutSection } from "@/lib/aboutUs";
import { MarketingCtaLink } from "./MarketingCtaLink";
import { AbacusCtaButton } from "./abacus-classic/MarketingLeadModals";
import { SparkAcademyCta } from "./spark-academy/SparkAcademyCta";
import { SparkAcademyAbout } from "./spark-academy/SparkAcademyAbout";
import { EduLearnCta } from "./edu-learn/EduLearnCta";

type FullProps = {
  config: HomepageConfig;
  marketingTheme?: MarketingTheme;
  /** When true, CTAs use enroll/apply modal hashes (Abacus/Spark). */
  useLeadModals?: boolean;
};

type TeaserProps = {
  config: HomepageConfig;
  marketingTheme?: MarketingTheme;
  /** Show link to full /about when published. */
  showPageLink?: boolean;
};

function resolveAbout(config: HomepageConfig): HomepageAboutSection {
  return mergeAboutSection(config.meta.siteName || "Our brand", config.about);
}

function TeamGrid({ section }: { section: HomepageAboutSection }) {
  const members = section.members ?? [];
  if (members.length === 0) return null;

  const bannerPhoto =
    members.length === 1 && members[0]?.photoUrl?.trim() ? members[0] : null;

  return (
    <section className="about-us__team" aria-labelledby="about-team-heading">
      <h2 id="about-team-heading" className="about-us__section-title">
        {section.teamTitle?.trim() || "OUR TEAM"}
      </h2>
      {bannerPhoto ? (
        <figure className="about-us__team-banner">
          <img
            src={bannerPhoto.photoUrl}
            alt={bannerPhoto.name || "Our team"}
            className="about-us__team-banner-photo"
          />
          {(bannerPhoto.name?.trim() || bannerPhoto.role?.trim()) && (
            <figcaption className="about-us__team-banner-caption">
              {[bannerPhoto.name, bannerPhoto.role].filter(Boolean).join(" — ")}
            </figcaption>
          )}
        </figure>
      ) : (
        <ul className="about-us__team-grid">
          {members.map((member) => (
            <li key={member.id || member.name} className="about-us__member">
              {member.photoUrl?.trim() ? (
                <img src={member.photoUrl} alt={member.name} className="about-us__member-photo" />
              ) : (
                <div className="about-us__member-photo about-us__member-photo--placeholder" aria-hidden />
              )}
              <h3 className="about-us__member-name">{member.name}</h3>
              <p className="about-us__member-role">{member.role}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FeaturesBlock({ section }: { section: HomepageAboutSection }) {
  const features = (section.features ?? []).filter((f) => f.title.trim() || f.body.trim());
  if (features.length === 0) return null;

  return (
    <section className="about-us__different" aria-labelledby="about-different-heading">
      <h2 id="about-different-heading" className="about-us__section-title">
        {section.differentTitle?.trim() || "WHAT MAKES US DIFFERENT?"}
      </h2>
      <ol className="about-us__features">
        {features.map((feature, index) => (
          <li key={feature.id || feature.title} className="about-us__feature">
            <span className="about-us__feature-index" aria-hidden>
              {index + 1}.
            </span>
            <div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AboutThemeCta({
  href,
  label,
  marketingTheme,
  useLeadModals,
  sparkVariant = "primary",
}: {
  href: string;
  label: string;
  marketingTheme?: MarketingTheme;
  useLeadModals?: boolean;
  sparkVariant?: "primary" | "dark" | "outline";
}) {
  if (marketingTheme === "spark-academy") {
    return <SparkAcademyCta href={href} label={label} variant={sparkVariant} />;
  }
  if (marketingTheme === "edu-learn") {
    return <EduLearnCta href={href} label={label} />;
  }
  if (marketingTheme === "abacus-classic" && useLeadModals) {
    return (
      <AbacusCtaButton
        href={href}
        label={label}
        variant={sparkVariant === "dark" ? "secondary" : "primary"}
      />
    );
  }
  return <MarketingCtaLink href={href} label={label} variant="on-light" />;
}

function CtaBand({
  section,
  marketingTheme,
  useLeadModals,
}: {
  section: HomepageAboutSection;
  marketingTheme?: MarketingTheme;
  useLeadModals?: boolean;
}) {
  const onlineLabel = section.onlineCtaLabel?.trim();
  const franchiseLabel = section.franchiseCtaLabel?.trim();
  if (!onlineLabel && !franchiseLabel) return null;

  const onlineHref = section.onlineCtaHref?.trim() || (useLeadModals ? "enroll" : "#enroll");
  const franchiseHref = section.franchiseCtaHref?.trim() || (useLeadModals ? "apply" : "#apply");

  return (
    <section className="about-us__cta-band" aria-label="Join online or franchise">
      {section.ctaEyebrow?.trim() ? <p className="about-us__cta-eyebrow">{section.ctaEyebrow}</p> : null}
      <div className="about-us__cta-grid">
        {onlineLabel ? (
          <article className="about-us__cta-card">
            {section.onlineCtaTitle?.trim() ? <h3>{section.onlineCtaTitle}</h3> : null}
            {section.onlineCtaBody?.trim() ? <p>{section.onlineCtaBody}</p> : null}
            <AboutThemeCta
              href={onlineHref}
              label={onlineLabel}
              marketingTheme={marketingTheme}
              useLeadModals={useLeadModals}
              sparkVariant="primary"
            />
          </article>
        ) : null}
        {franchiseLabel ? (
          <article className="about-us__cta-card">
            {section.franchiseCtaTitle?.trim() ? <h3>{section.franchiseCtaTitle}</h3> : null}
            {section.franchiseCtaBody?.trim() ? <p>{section.franchiseCtaBody}</p> : null}
            <AboutThemeCta
              href={franchiseHref}
              label={franchiseLabel}
              marketingTheme={marketingTheme}
              useLeadModals={useLeadModals}
              sparkVariant="dark"
            />
          </article>
        ) : null}
      </div>
    </section>
  );
}

/** Full About Us page — Novu (Mastermind), Abacus Classic, or EduLearn chrome. Spark uses SparkAcademyAbout. */
export function AboutUsPageContent({
  config,
  marketingTheme,
  useLeadModals = false,
}: FullProps) {
  if (!aboutHasContent(config.about)) return null;
  if (marketingTheme === "spark-academy") {
    return <SparkAcademyAbout config={config} />;
  }
  const section = resolveAbout(config);

  return (
    <div className={`about-us about-us--page ${aboutUsThemeClass(marketingTheme)}`}>
      <header className="about-us__hero">
        <div className="about-us__hero-inner">
          {marketingTheme === "edu-learn" ? (
            <span className="about-us__hero-badge">About us</span>
          ) : null}
          {section.heroHeadline?.trim() ? <h1>{section.heroHeadline}</h1> : null}
          {section.heroSubtitle?.trim() ? <p className="about-us__hero-sub">{section.heroSubtitle}</p> : null}
          {config.meta.logoUrl ? (
            <img src={config.meta.logoUrl} alt={config.meta.siteName} className="about-us__hero-logo" />
          ) : (
            <p className="about-us__hero-brand">{config.meta.siteName}</p>
          )}
        </div>
      </header>

      <div className="about-us__body">
        <section className="about-us__story" aria-labelledby="about-story-heading">
          <h2 id="about-story-heading" className="about-us__section-title">
            {section.title?.trim() || `ABOUT ${config.meta.siteName}`}
          </h2>
          <div className="about-us__story-grid">
            {section.body?.trim() ? <p className="about-us__story-copy">{section.body}</p> : null}
            {section.imageUrl?.trim() ? (
              <img src={section.imageUrl} alt="" className="about-us__story-image" />
            ) : null}
          </div>
        </section>

        {(section.philosophyTitle?.trim() || section.philosophyBody?.trim()) && (
          <section className="about-us__philosophy">
            {section.philosophyTitle?.trim() ? <h2>{section.philosophyTitle}</h2> : null}
            {section.philosophyBody?.trim() ? <p>{section.philosophyBody}</p> : null}
            {section.philosophyImageUrl?.trim() ? (
              <img src={section.philosophyImageUrl} alt="" className="about-us__story-image" />
            ) : null}
          </section>
        )}

        <FeaturesBlock section={section} />

        {(section.whatWeDoTitle?.trim() || section.whatWeDoBody?.trim()) && (
          <section className="about-us__what" aria-labelledby="about-what-heading">
            <h2 id="about-what-heading" className="about-us__section-title">
              {section.whatWeDoTitle?.trim() || "WHAT WE DO?"}
            </h2>
            {section.whatWeDoBody?.trim() ? (
              <div className="about-us__what-copy">
                {section.whatWeDoBody.split(/\n\n+/).map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
            ) : null}
          </section>
        )}

        <TeamGrid section={section} />
        <CtaBand section={section} marketingTheme={marketingTheme} useLeadModals={useLeadModals} />
      </div>
    </div>
  );
}

/** Homepage `#about` teaser — condensed story + features + team preview. */
export function AboutUsHomepageSection({
  config,
  marketingTheme,
  showPageLink = true,
}: TeaserProps) {
  if (!aboutHasContent(config.about)) return null;
  const section = resolveAbout(config);
  const previewMembers = (section.members ?? []).slice(0, 4);

  return (
    <section className={`about-us about-us--teaser ${aboutUsThemeClass(marketingTheme)}`} id="about">
      <div className="about-us__teaser-inner">
        <h2 className="about-us__section-title">{section.title?.trim() || `About ${config.meta.siteName}`}</h2>
        {section.body?.trim() ? <p className="about-us__teaser-copy">{section.body}</p> : null}
        <FeaturesBlock section={section} />
        {previewMembers.length > 0 ? (
          <ul className="about-us__team-grid about-us__team-grid--teaser">
            {previewMembers.map((member) => (
              <li key={member.id || member.name} className="about-us__member">
                {member.photoUrl?.trim() ? (
                  <img src={member.photoUrl} alt={member.name} className="about-us__member-photo" />
                ) : (
                  <div className="about-us__member-photo about-us__member-photo--placeholder" aria-hidden />
                )}
                <h3 className="about-us__member-name">{member.name}</h3>
                <p className="about-us__member-role">{member.role}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {showPageLink ? (
          <p className="about-us__teaser-link">
            <Link to="/about">Read our full story</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
