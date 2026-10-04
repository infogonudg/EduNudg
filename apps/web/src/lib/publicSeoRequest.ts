import { resolveTenantFromHost, type PortalType } from "@edunudg/tenant";
import { usesSameOriginPortals } from "./brandPortalUrl";
import { parsePortalOverrideFromSearch, syntheticLookupHostname } from "./portalOverride";
import {
  BRAND_LEGAL_PAGE_KINDS,
  hasBrandLegalPage,
  type BrandLegalPageKind,
  type BrandLegalPages,
} from "./brandLegalPages";
import type { PublicCurriculumProgram } from "./brandCurriculumPublic";
import type { BrandSocialConnect } from "./brandSocialConnect";
import type { HomepageConfig } from "../types/homepage";
import {
  courseForPath,
  derivePublicSeo,
  isVercelAppHost,
  publishedCourseSitemapPaths,
  seoInputFromHomepage,
  socialSameAsUrls,
  type PublicSeoCenter,
  type PublicSeoInput,
  type PublicSeoPortal,
  type PublicSeoSnapshot,
} from "./publicSeo";
import type { PublicSitemapInput } from "./publicSeoDiscovery";

export function resolveSeoTenant(hostname: string, search = ""): { portal: PublicSeoPortal; brandSlug: string | null; centerSlug: string | null } {
  const host = hostname.split(":")[0].toLowerCase();
  const override = parsePortalOverrideFromSearch(search);
  const lookup =
    override && usesSameOriginPortals(host) ? syntheticLookupHostname(override) : host;
  const tenant = resolveTenantFromHost(lookup);
  return {
    portal: tenant.portalType as PublicSeoPortal,
    brandSlug: tenant.brandSlug,
    centerSlug: tenant.centerSlug,
  };
}

export function isVercelPreviewRequest(hostname: string, vercelEnv?: string): boolean {
  if (vercelEnv === "preview") return true;
  const host = hostname.toLowerCase();
  return isVercelAppHost(host) && host.includes("-git-");
}

export function requestOriginFromHost(hostname: string, protocol = "https"): string {
  const host = hostname.replace(/\/+$/, "");
  return `${protocol}://${host}`;
}

export function buildPublicSeoInput(args: {
  hostname: string;
  pathname: string;
  search?: string;
  protocol?: string;
  portalBaseDomain?: string;
  vercelEnv?: string;
  config?: HomepageConfig | null;
  programs?: PublicCurriculumProgram[];
  legalPages?: BrandLegalPages;
  socialConnect?: BrandSocialConnect;
  center?: PublicSeoCenter | null;
  brandName?: string | null;
}): PublicSeoInput {
  const tenant = resolveSeoTenant(args.hostname, args.search ?? "");
  const fromConfig = args.config ? seoInputFromHomepage(args.config, { siteName: args.config.meta.siteName }) : {};
  const legalKind = args.pathname.startsWith("/legal/")
    ? (args.pathname.split("/")[2] as BrandLegalPageKind | undefined)
    : undefined;
  return {
    ...fromConfig,
    portal: tenant.portal,
    pathname: args.pathname,
    requestOrigin: requestOriginFromHost(args.hostname, args.protocol ?? "https"),
    requestSearch: args.search,
    portalBaseDomain: args.portalBaseDomain,
    isPreview: isVercelPreviewRequest(args.hostname, args.vercelEnv),
    brandSlug: tenant.brandSlug,
    centerSlug: tenant.centerSlug,
    siteName: fromConfig.siteName || args.brandName || "EduNudg",
    brandName: args.brandName ?? fromConfig.siteName ?? null,
    course: courseForPath(args.programs ?? [], args.pathname),
    legalKind: legalKind && BRAND_LEGAL_PAGE_KINDS.includes(legalKind) ? legalKind : null,
    legalPublished: legalKind ? hasBrandLegalPage(args.legalPages ?? {}, legalKind) : undefined,
    socialSameAs: socialSameAsUrls(args.socialConnect ?? {}),
    center: args.center ?? null,
  };
}

export function deriveRequestPublicSeo(args: Parameters<typeof buildPublicSeoInput>[0]): PublicSeoSnapshot {
  return derivePublicSeo(buildPublicSeoInput(args));
}

export function sitemapInputFromRequest(
  args: Parameters<typeof buildPublicSeoInput>[0]
): PublicSitemapInput {
  const input = buildPublicSeoInput(args);
  return {
    ...input,
    coursePaths: publishedCourseSitemapPaths(args.programs ?? []),
    publishedLegalKinds: BRAND_LEGAL_PAGE_KINDS.filter((kind) => hasBrandLegalPage(args.legalPages ?? {}, kind)),
  };
}

export function portalTypeAllowsMarketingSeo(portal: PortalType | PublicSeoPortal): boolean {
  return portal === "platform" || portal === "brand" || portal === "center";
}
