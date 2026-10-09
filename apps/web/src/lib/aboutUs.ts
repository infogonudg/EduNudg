import type {
  HomepageAboutFeature,
  HomepageAboutMember,
  HomepageAboutSection,
  HomepageConfig,
  HomepageFeatureSection,
  HomepageFeaturesShowcase,
  HomepageFounderProfile,
  HomepageTrustCard,
  HomepageTrustMedia,
} from "../types/homepage";

export function emptyAboutFeature(): HomepageAboutFeature {
  return {
    id: `feature-${Math.random().toString(36).slice(2, 10)}`,
    title: "New differentiator",
    body: "Describe what makes your brand different.",
  };
}

export function emptyAboutMember(): HomepageAboutMember {
  return {
    id: `member-${Math.random().toString(36).slice(2, 10)}`,
    name: "Team member",
    role: "Role",
    photoUrl: "",
  };
}

/** Mastermind-inspired placeholder structure; brands replace copy and photos. */
export function defaultAboutSection(brandName: string): HomepageAboutSection {
  return {
    heroHeadline: "WE MAKE WINNERS WHO LEAD",
    heroSubtitle: "A complete brain development program on a live online learning platform",
    heroImageUrl: "",
    title: `ABOUT ${brandName.toUpperCase()}`,
    body: `We are ${brandName}, an education company focused on the next generation of learners. We identify basic learning challenges in kids and develop programs that make learning simpler — shared globally through our franchise network.`,
    imageUrl: "",
    philosophyTitle: "Our Endeavour",
    philosophyBody:
      "To 'Simplify The Learning Methods' so that every student can RISE — Research, Innovate, Share & Educate.",
    philosophyImageUrl: "",
    differentTitle: "WHAT MAKES US DIFFERENT?",
    features: [
      {
        id: "research",
        title: "We Research",
        body: "Our research follows changing educational needs of students in a globalized world.",
      },
      {
        id: "innovate",
        title: "We Innovate",
        body: "We develop learning materials that simplify the entire learning process.",
      },
      {
        id: "share",
        title: "We Share",
        body: "We share new knowledge with aspiring teachers through high-quality training.",
      },
      {
        id: "educate",
        title: "We Educate",
        body: "Franchise associates are trained and certified to deliver consistent education quality.",
      },
    ],
    whatWeDoTitle: "WHAT WE DO?",
    whatWeDoBody: `Striving to Educate, Not Just Teach.\n\n${brandName} focuses on brain development programs that help children build confidence and clarity. Over time we expanded through franchise partners so more students can benefit — online and offline.`,
    teamTitle: "OUR TEAM",
    members: [],
    publishPage: true,
    ctaEyebrow: "MAKE YOUR CHOICE",
    onlineCtaTitle: "ONLINE CLASSES",
    onlineCtaBody: "Looking for classes for your child? Book a free demo for a firsthand experience.",
    onlineCtaLabel: "Book a free demo",
    onlineCtaHref: "enroll",
    franchiseCtaTitle: "FRANCHISE",
    franchiseCtaBody: "Looking for a business opportunity? Submit an inquiry and we will contact you.",
    franchiseCtaLabel: "Inquire now",
    franchiseCtaHref: "apply",
  };
}

export function emptyAboutSection(brandName = "Our brand"): HomepageAboutSection {
  return defaultAboutSection(brandName);
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when About has enough content to render publicly. */
export function aboutHasContent(section: HomepageAboutSection | undefined | null): boolean {
  if (!section) return false;
  if (hasText(section.title) || hasText(section.body) || hasText(section.heroHeadline)) return true;
  if (hasText(section.philosophyBody) || hasText(section.whatWeDoBody)) return true;
  if ((section.features ?? []).some((f) => hasText(f.title) || hasText(f.body))) return true;
  if ((section.members ?? []).some((m) => hasText(m.name) || hasText(m.photoUrl))) return true;
  return false;
}

/** Public `/about` is available when publishPage is not false and content exists. */
export function isAboutPagePublished(section: HomepageAboutSection | undefined | null): boolean {
  if (!aboutHasContent(section)) return false;
  return section?.publishPage !== false;
}

export function mergeAboutSection(
  brandName: string,
  partial?: HomepageAboutSection | null
): HomepageAboutSection {
  const base = defaultAboutSection(brandName);
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    features: partial.features?.length ? partial.features.map((f) => ({ ...f })) : base.features,
    members: partial.members ? partial.members.map((m) => ({ ...m })) : base.members,
  };
}

/** Map About differentiators onto the Spark Features list. */
export function aboutFeaturesAsHomepageSections(
  section: HomepageAboutSection
): HomepageFeatureSection[] {
  return (section.features ?? [])
    .filter((feature) => hasText(feature.title) || hasText(feature.body))
    .map((feature) => ({
      id: feature.id || feature.title,
      title: feature.title,
      titleSerif: "",
      body: feature.body,
    }));
}

/** Spark Features showcase: About copy + homepage float stats / fallback photo. */
export function aboutFeaturesShowcase(
  section: HomepageAboutSection,
  fallback?: HomepageFeaturesShowcase | null
): HomepageFeaturesShowcase {
  return {
    ...fallback,
    eyebrow: section.title?.trim() || fallback?.eyebrow || "About us",
    title: section.differentTitle?.trim() || "What makes us different",
    subtitle: section.body?.trim() || fallback?.subtitle || "",
    imageUrl: section.imageUrl?.trim() || fallback?.imageUrl,
  };
}

/** Map team grid members onto Spark mentor / founder cards. */
export function aboutMembersAsFounders(
  members: HomepageAboutMember[] | undefined
): HomepageFounderProfile[] {
  return (members ?? [])
    .filter((member) => hasText(member.name) || hasText(member.photoUrl))
    .map((member) => ({
      roleBadge: member.role,
      name: member.name,
      title: "",
      bio: member.bio ?? "",
      photoUrl: member.photoUrl,
    }));
}

function whatWeDoParagraphs(section: HomepageAboutSection): string[] {
  return (section.whatWeDoBody ?? "")
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean);
}

/** Journey rows from “what we do” copy (first short paragraph can be the card title). */
export function aboutJourneyCards(section: HomepageAboutSection): HomepageTrustCard[] {
  const whatTitle = section.whatWeDoTitle?.trim() || "What we do";
  const paras = whatWeDoParagraphs(section);
  if (paras.length === 0) return [];
  if (paras.length >= 2 && paras[0]!.length <= 80) {
    return [
      {
        title: paras[0]!.replace(/\.$/, ""),
        subtitle: paras.slice(1).join(" "),
      },
    ];
  }
  return paras.slice(0, 3).map((para) => ({ title: whatTitle, subtitle: para }));
}

/**
 * Spark Journey block for `/about`: philosophy header + what-we-do rows,
 * keeping the homepage highlight photo/stats so the block matches `/`.
 */
export function aboutJourneyTrust(
  section: HomepageAboutSection,
  fallback?: HomepageTrustMedia | null
): HomepageTrustMedia | null {
  const philosophyTitle = section.philosophyTitle?.trim() || "";
  const philosophyBody = section.philosophyBody?.trim() || "";
  const whatTitle = section.whatWeDoTitle?.trim() || "";
  const whatBody = section.whatWeDoBody?.trim() || "";
  if (!philosophyTitle && !philosophyBody && !whatTitle && !whatBody) return null;

  const cards = aboutJourneyCards(section);

  return {
    youtubeUrl: fallback?.youtubeUrl ?? "",
    ...fallback,
    eyebrow: whatTitle || fallback?.eyebrow || "Our story",
    title: philosophyTitle || fallback?.title || "Our journey",
    titleHighlight: "",
    intro: philosophyBody,
    imageUrl: section.philosophyImageUrl?.trim() || fallback?.imageUrl,
    cards,
  };
}

/**
 * Map a custom About headline onto Spark hero lines so navy + blue highlight
 * colours still match the homepage (last word becomes `.sa-hero__highlight`).
 */
export function aboutHeadlineToHeroLines(headline: string): {
  line1: string;
  line1Serif: string;
  line2: string;
  line2Serif: string;
} {
  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { line1: "", line1Serif: "", line2: "", line2Serif: "" };
  }
  if (words.length === 1) {
    return { line1: words[0]!, line1Serif: "", line2: "", line2Serif: "" };
  }
  return {
    line1: words.slice(0, -1).join(" "),
    line1Serif: words[words.length - 1]!,
    line2: "",
    line2Serif: "",
  };
}

/** Spark hero on `/about`: About headline/subtitle/CTA on the homepage hero block. */
export function aboutHeroConfig(
  config: HomepageConfig,
  about: HomepageAboutSection
): HomepageConfig {
  const headline = about.heroHeadline?.trim();
  const subtitle = about.heroSubtitle?.trim();
  const ctaLabel = about.onlineCtaLabel?.trim();
  const ctaHref = about.onlineCtaHref?.trim();
  const stockHeadline = defaultAboutSection(config.meta.siteName || "Our brand").heroHeadline?.trim();
  // Stock Mastermind seed must not wipe homepage navy/blue title colours.
  const useHomepageTitle = !headline || headline === stockHeadline;
  const customLines = headline && !useHomepageTitle ? aboutHeadlineToHeroLines(headline) : null;

  return {
    ...config,
    hero: {
      ...config.hero,
      badge: "",
      line1: customLines?.line1 ?? config.hero.line1,
      line1Serif: customLines?.line1Serif ?? config.hero.line1Serif,
      line2: customLines ? customLines.line2 : config.hero.line2,
      line2Serif: customLines ? customLines.line2Serif : config.hero.line2Serif,
      subtitle: subtitle || config.hero.subtitle,
      ctaLabel: ctaLabel || config.hero.ctaLabel,
      ctaHref: ctaHref || config.hero.ctaHref,
      backgroundImageUrl: about.heroImageUrl?.trim() || config.hero.backgroundImageUrl,
    },
  };
}
