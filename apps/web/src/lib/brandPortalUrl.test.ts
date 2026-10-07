import { afterEach, describe, expect, it, vi } from "vitest";
import {
  brandPortalHostname,
  brandPortalTarget,
  brandPortalUrl,
  centerPortalUrl,
  learnPortalUrl,
  normalizePortalHostname,
  portalBackendUrl,
  portalHandoffLoginUrl,
  portalLoginUrl,
  portalTargetFromDomain,
  usesSameOriginPortals,
} from "./brandPortalUrl";

describe("brandPortalUrl", () => {
  const original = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", { value: original, writable: true });
    vi.unstubAllEnvs();
  });

  function mockLocation(hostname: string, port = "9000", protocol = "http:") {
    const origin =
      port && port !== "80" && port !== "443"
        ? `${protocol}//${hostname}:${port}`
        : `${protocol}//${hostname}`;
    Object.defineProperty(window, "location", {
      value: { protocol, hostname, port, origin },
      writable: true,
    });
  }

  it("uses slug.localhost on platform localhost", () => {
    mockLocation("localhost");
    expect(brandPortalHostname("abacusworld")).toBe("abacusworld.localhost");
    expect(brandPortalUrl("abacusworld")).toBe("http://abacusworld.localhost:9000/");
  });

  it("prefers mapped hostname when provided", () => {
    mockLocation("localhost");
    expect(brandPortalUrl("abacusworld", "custom-brand.example.com")).toBe(
      "http://custom-brand.example.com:9000/"
    );
  });

  it("regression_brand_portal_url_strips_admin_subdomain", () => {
    mockLocation("admin.edunudg.com", "");
    expect(brandPortalHostname("acme")).toBe("acme.edunudg.com");
    expect(brandPortalUrl("acme")).toBe("http://acme.edunudg.com/");
  });

  it("builds center portal url from brand and center slugs", () => {
    mockLocation("localhost");
    expect(centerPortalUrl("abacusworld", "koramangala")).toBe(
      "http://koramangala.abacusworld.localhost:9000/"
    );
  });

  it("regression_portal_backend_url_points_to_app_for_brand_and_center", () => {
    mockLocation("localhost");
    expect(
      portalBackendUrl({ portalType: "brand", brandSlug: "abacusworld", hostname: "abacusworld.localhost" })
    ).toBe("http://abacusworld.localhost:9000/app");
    expect(
      portalBackendUrl({
        portalType: "center",
        brandSlug: "abacusworld",
        centerSlug: "koramangala",
        hostname: "koramangala.abacusworld.localhost",
      })
    ).toBe("http://koramangala.abacusworld.localhost:9000/app");
  });

  it("regression_portal_login_url_matches_env_for_center", () => {
    mockLocation("localhost");
    expect(
      portalLoginUrl({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "center-2",
      })
    ).toBe("http://center-2.smart-brain-abacus.localhost:9000/login");

    mockLocation("edunudg-hub.vercel.app", "", "https:");
    expect(
      portalLoginUrl({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "center-2",
      })
    ).toBe("https://edunudg-hub.vercel.app/b/smart-brain-abacus/centers/center-2/login");
  });

  it("regression_portal_handoff_login_url_includes_next_path", () => {
    mockLocation("localhost");
    expect(
      portalHandoffLoginUrl({
        portalType: "brand",
        brandSlug: "smart-brain-abacus",
        hostname: "smart-brain-abacus.localhost",
      })
    ).toBe("http://smart-brain-abacus.localhost:9000/auth/handoff?next=%2Fapp");
  });

  it("regression_portal_target_from_domain_supports_center_and_learn", () => {
    mockLocation("localhost");
    expect(
      portalTargetFromDomain("center", "koramangala.abacusworld.localhost", "abacusworld")
    ).toEqual({
      portalType: "center",
      brandSlug: "abacusworld",
      centerSlug: "koramangala",
      hostname: "koramangala.abacusworld.localhost",
    });
    expect(portalTargetFromDomain("learn", "learn.abacusworld.localhost", "abacusworld")).toEqual({
      portalType: "learn",
      brandSlug: "abacusworld",
      hostname: "learn.abacusworld.localhost",
    });
  });

  it("builds learn portal url", () => {
    mockLocation("localhost");
    expect(learnPortalUrl("abacusworld")).toBe("http://learn.abacusworld.localhost:9000/");
  });

  it("regression_vercel_same_origin_handoff_avoids_localhost_hosts", () => {
    mockLocation("edunudg-hub.vercel.app", "", "https:");
    expect(usesSameOriginPortals()).toBe(true);
    expect(
      portalHandoffLoginUrl(brandPortalTarget("smart-brain-abacus", "smart-brain-abacus.localhost"))
    ).toBe(
      "https://edunudg-hub.vercel.app/auth/handoff?portal=brand&brand=smart-brain-abacus&next=%2Fapp"
    );
    expect(
      portalBackendUrl({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "pune",
        hostname: "pune.smart-brain-abacus.localhost",
      })
    ).toBe("https://edunudg-hub.vercel.app/app?portal=center&brand=smart-brain-abacus&center=pune");
    expect(learnPortalUrl("abacusworld")).toBe(
      "https://edunudg-hub.vercel.app/?portal=learn&brand=abacusworld"
    );
  });

  it("regression_brand_custom_domain_center_links_use_same_origin_query", () => {
    mockLocation("www.smartbraineducations.com", "", "https:");
    expect(usesSameOriginPortals()).toBe(true);
    expect(centerPortalUrl("smart-brain-abacus", "bhagyashri-dhonde")).toBe(
      "https://www.smartbraineducations.com/?portal=center&brand=smart-brain-abacus&center=bhagyashri-dhonde"
    );
    expect(
      portalBackendUrl({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "bhagyashri-dhonde",
      })
    ).toBe(
      "https://www.smartbraineducations.com/app?portal=center&brand=smart-brain-abacus&center=bhagyashri-dhonde"
    );
    expect(
      portalLoginUrl({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "bhagyashri-dhonde",
      })
    ).toBe("https://www.smartbraineducations.com/centers/bhagyashri-dhonde/login");
  });

  it("regression_rewrites_localhost_domain_mappings_when_base_domain_set", () => {
    vi.stubEnv("VITE_PORTAL_BASE_DOMAIN", "edunudg.com");
    mockLocation("admin.edunudg.com", "", "https:");
    expect(normalizePortalHostname("smart-brain-abacus.localhost")).toBe("smart-brain-abacus.edunudg.com");
    expect(normalizePortalHostname("koramangala.smart-brain-abacus.localhost")).toBe(
      "koramangala.smart-brain-abacus.edunudg.com"
    );
    expect(usesSameOriginPortals()).toBe(false);
    expect(
      portalHandoffLoginUrl({
        portalType: "brand",
        brandSlug: "smart-brain-abacus",
        hostname: "smart-brain-abacus.localhost",
      })
    ).toBe("https://smart-brain-abacus.edunudg.com/auth/handoff?next=%2Fapp");
  });
});
