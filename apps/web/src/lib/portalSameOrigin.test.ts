import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isLocalDevHostname, usesSameOriginPortalsHost } from "./portalSameOrigin";
import { resolveSeoTenant } from "./publicSeoRequest";
import { buildRobotsTxt } from "./publicSeoDiscovery";
import { handlePublicSeoDiscovery } from "./publicSeoHandlers";

describe("portalSameOrigin", () => {
  it("detects local and same-origin hosts without window", () => {
    expect(isLocalDevHostname("brand.localhost")).toBe(true);
    expect(usesSameOriginPortalsHost("smartbraineducations.com", "smartbraineducations.com")).toBe(false);
    expect(usesSameOriginPortalsHost("edunudg-hub.vercel.app", "")).toBe(true);
  });
});

describe("publicSeo serverless safety", () => {
  it("regression_public_seo_request_does_not_import_brand_portal_url", () => {
    const src = readFileSync(resolve(__dirname, "publicSeoRequest.ts"), "utf8");
    expect(src).not.toMatch(/brandPortalUrl/);
    expect(src).toMatch(/portalSameOrigin/);
  });

  it("regression_robots_txt_builds_without_supabase_for_custom_domain", async () => {
    const req = new Request("https://smartbraineducations.com/api/public-seo?file=robots", {
      headers: { host: "smartbraineducations.com", "x-forwarded-proto": "https" },
    });
    const res = await handlePublicSeoDiscovery(req, "robots");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-agent:\s*\*/);
    expect(body).toMatch(/Sitemap:\s*https:\/\/smartbraineducations\.com\/sitemap\.xml/);
  });

  it("resolveSeoTenant_uses_host_slug_heuristics_on_apex_brand_domain", () => {
    const tenant = resolveSeoTenant("smartbraineducations.com", "", "smartbraineducations.com");
    expect(tenant.portal).toBe("brand");
    expect(tenant.brandSlug).toBe("smartbraineducations");
  });

  it("buildRobotsTxt_includes_sitemap_when_not_preview", () => {
    const txt = buildRobotsTxt({
      requestOrigin: "https://smartbraineducations.com",
      portal: "brand",
      brandSlug: "smart-brain-abacus",
      centerSlug: null,
      portalBaseDomain: "smartbraineducations.com",
      preferredHostname: "smartbraineducations.com",
      isPreview: false,
    });
    expect(txt).toContain("Sitemap: https://smartbraineducations.com/sitemap.xml");
  });
});
