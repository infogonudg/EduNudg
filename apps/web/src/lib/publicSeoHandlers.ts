import { deriveRequestPublicSeo, isVercelPreviewRequest, resolveSeoTenant, sitemapInputFromRequest } from "./publicSeoRequest";
import { buildAiTxt, buildLlmsTxt, buildRobotsTxt, buildSitemapXml, isPublicDiscoveryPath } from "./publicSeoDiscovery";
import { injectPublicSeoHead } from "./publicSeoHtml";
import { loadPublicSeoPageDataRemote, readPublicSeoEnv } from "./publicSeoRemote";

export function requestHost(req: Request): string {
  const url = new URL(req.url);
  const forwarded = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return forwarded.split(",")[0]?.trim() || url.host;
}

export function requestProtocol(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "https";
  return new URL(req.url).protocol.replace(":", "") || "https";
}

async function pageArgs(req: Request, pathname: string) {
  const env = readPublicSeoEnv();
  const host = requestHost(req);
  const search = new URL(req.url).search;
  const tenant = resolveSeoTenant(host, search, env.portalBaseDomain);
  const data = await loadPublicSeoPageDataRemote(env, tenant.portal, tenant.brandSlug, tenant.centerSlug);
  return {
    hostname: host,
    pathname,
    search,
    protocol: requestProtocol(req),
    portalBaseDomain: env.portalBaseDomain,
    vercelEnv: env.vercelEnv,
    ...data,
  };
}

/** robots / ai.txt only need host + env — never block on Supabase. */
function discoveryHostInput(req: Request) {
  const env = readPublicSeoEnv();
  const host = requestHost(req);
  const search = new URL(req.url).search;
  const protocol = requestProtocol(req);
  const tenant = resolveSeoTenant(host, search, env.portalBaseDomain);
  return {
    requestOrigin: `${protocol}://${host}`,
    portal: tenant.portal,
    brandSlug: tenant.brandSlug,
    centerSlug: tenant.centerSlug,
    portalBaseDomain: env.portalBaseDomain,
    // Keep Sitemap URL on the host that served robots.txt (apex custom domains).
    preferredHostname: host,
    isPreview: isVercelPreviewRequest(host, env.vercelEnv),
  };
}

export async function handlePublicSeoDiscovery(req: Request, file: string): Promise<Response> {
  const url = new URL(req.url);
  const kind = file || isPublicDiscoveryPath(url.pathname) || "";
  const textHeaders = { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" };
  const xmlHeaders = { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" };

  if (kind === "robots") {
    return new Response(buildRobotsTxt(discoveryHostInput(req)), { headers: textHeaders });
  }
  if (kind === "ai") {
    return new Response(buildAiTxt(discoveryHostInput(req)), { headers: textHeaders });
  }

  const args = await pageArgs(req, "/");
  const sitemapInput = sitemapInputFromRequest(args);
  if (kind === "sitemap") {
    return new Response(buildSitemapXml(sitemapInput), { headers: xmlHeaders });
  }
  if (kind === "llms") {
    return new Response(buildLlmsTxt(sitemapInput), { headers: textHeaders });
  }
  return new Response("Not found", { status: 404 });
}

export async function handleSeoDocument(req: Request, html: string): Promise<Response> {
  const url = new URL(req.url);
  const args = await pageArgs(req, url.pathname);
  const seo = deriveRequestPublicSeo(args);
  return new Response(injectPublicSeoHead(html, seo), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
