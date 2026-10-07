import { afterEach, describe, expect, it } from "vitest";
import {
  clearPortalOverride,
  isPortalPathSlug,
  parsePortalOverrideFromPath,
  parsePortalOverrideFromSearch,
  readPortalOverride,
  syntheticLookupHostname,
  writePortalOverride,
} from "./portalOverride";

describe("portalOverride", () => {
  afterEach(() => {
    clearPortalOverride();
  });

  it("parses brand portal query params", () => {
    expect(parsePortalOverrideFromSearch("?portal=brand&brand=Smart-Brain-Abacus")).toEqual({
      portalType: "brand",
      brandSlug: "smart-brain-abacus",
      centerSlug: null,
    });
  });

  it("regression_requires_center_slug_for_center_portal", () => {
    expect(parsePortalOverrideFromSearch("?portal=center&brand=abacusworld")).toBeNull();
    expect(parsePortalOverrideFromSearch("?portal=center&brand=abacusworld&center=Koramangala")).toEqual({
      portalType: "center",
      brandSlug: "abacusworld",
      centerSlug: "koramangala",
    });
  });

  it("persists override in sessionStorage", () => {
    writePortalOverride({ portalType: "learn", brandSlug: "abacusworld" });
    expect(readPortalOverride()).toEqual({
      portalType: "learn",
      brandSlug: "abacusworld",
      centerSlug: null,
    });
  });

  it("builds synthetic localhost lookup hosts for domain_mappings", () => {
    expect(syntheticLookupHostname({ portalType: "brand", brandSlug: "smart-brain-abacus" })).toBe(
      "smart-brain-abacus.localhost"
    );
    expect(
      syntheticLookupHostname({
        portalType: "center",
        brandSlug: "smart-brain-abacus",
        centerSlug: "pune",
      })
    ).toBe("pune.smart-brain-abacus.localhost");
    expect(syntheticLookupHostname({ portalType: "learn", brandSlug: "abacusworld" })).toBe(
      "learn.abacusworld.localhost"
    );
  });

  it("regression_pretty_login_path_parses_center_and_student", () => {
    expect(isPortalPathSlug("kalyani-gebad")).toBe(true);
    expect(isPortalPathSlug("../etc")).toBe(false);
    expect(
      parsePortalOverrideFromPath("/centers/kalyani-gebad/login", "smart-brain-abacus")
    ).toEqual({
      portalType: "center",
      brandSlug: "smart-brain-abacus",
      centerSlug: "kalyani-gebad",
    });
    expect(
      parsePortalOverrideFromPath("/centers/kalyani-gebad/student-login", "smart-brain-abacus")
    ).toEqual({
      portalType: "learn",
      brandSlug: "smart-brain-abacus",
      centerSlug: "kalyani-gebad",
    });
    expect(
      parsePortalOverrideFromPath("/b/smart-brain-abacus/centers/kalyani-gebad/login")
    ).toEqual({
      portalType: "center",
      brandSlug: "smart-brain-abacus",
      centerSlug: "kalyani-gebad",
    });
    expect(parsePortalOverrideFromPath("/centers/kalyani-gebad/login")).toBeNull();
  });
});
