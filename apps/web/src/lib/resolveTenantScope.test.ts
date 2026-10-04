import { describe, expect, it, vi } from "vitest";
import type { TenantContext } from "@edunudg/tenant";
import {
  mergePortalBrandingScope,
  needsBrandPortalBranding,
  needsPortalScopeIds,
  resolveSlugsFromDomainMapping,
  resolveTenantScope,
} from "./resolveTenantScope";

const ABACUSWORLD_BRAND_ID = "a0000000-0000-4000-8000-000000000001";
const KORAMANGALA_CENTER_ID = "b0000000-0000-4000-8000-000000000001";
const SMART_BRAIN_BRAND_ID = "8db8ffa0-b77b-419d-89bb-baa9efd565f9";

function brandHostTenant(): TenantContext {
  return {
    hostname: "abacusworld.localhost",
    portalType: "brand",
    brandId: null,
    centerId: null,
    brandSlug: "abacusworld",
    centerSlug: null,
  };
}

describe("resolveTenantScope helpers", () => {
  it("needsPortalScopeIds when brand host lacks brand id", () => {
    expect(needsPortalScopeIds(brandHostTenant())).toBe(true);
  });

  it("mergePortalBrandingScope fills brand id from rpc branding", () => {
    const merged = mergePortalBrandingScope(brandHostTenant(), {
      brandId: ABACUSWORLD_BRAND_ID,
      brandSlug: "abacusworld",
      brandName: "Abacus World",
      brandLogoUrl: "https://cdn.example/logo.png",
      centerId: null,
      centerSlug: null,
      centerName: null,
      loginHeadline: null,
      loginSubtext: null,
    });

    expect(merged.brandId).toBe(ABACUSWORLD_BRAND_ID);
  });

  it("regression_prefers_slug_resolved_brand_id_over_stale_domain_mapping", () => {
    const STALE_DOMAIN_BRAND_ID = "ddbdae88-a273-4300-92aa-c719cacc6bc2";

    const merged = mergePortalBrandingScope(
      {
        hostname: "abacusworld.localhost",
        portalType: "brand",
        brandId: STALE_DOMAIN_BRAND_ID,
        centerId: null,
        brandSlug: "abacusworld",
        centerSlug: null,
      },
      {
        brandId: ABACUSWORLD_BRAND_ID,
        brandSlug: "abacusworld",
        brandName: "Abacus World",
        brandLogoUrl: null,
        centerId: null,
        centerSlug: null,
        centerName: null,
        loginHeadline: null,
        loginSubtext: null,
      }
    );

    expect(merged.brandId).toBe(ABACUSWORLD_BRAND_ID);
  });

  it("regression_mergePortalBrandingScope_fills_center_id_for_center_host", () => {
    const merged = mergePortalBrandingScope(
      {
        hostname: "koramangala.abacusworld.localhost",
        portalType: "center",
        brandId: null,
        centerId: null,
        brandSlug: "abacusworld",
        centerSlug: "koramangala",
      },
      {
        brandId: ABACUSWORLD_BRAND_ID,
        brandSlug: "abacusworld",
        brandName: "Abacus World",
        brandLogoUrl: null,
        centerId: KORAMANGALA_CENTER_ID,
        centerSlug: "koramangala",
        centerName: "Abacus World Koramangala",
        loginHeadline: null,
        loginSubtext: null,
      }
    );

    expect(merged.brandId).toBe(ABACUSWORLD_BRAND_ID);
    expect(merged.centerId).toBe(KORAMANGALA_CENTER_ID);
    expect(needsPortalScopeIds(merged)).toBe(false);
  });

  it("regression_learn_portal_needs_brand_id_from_branding", () => {
    const learnTenant: TenantContext = {
      hostname: "learn.smart-brain-abacus.localhost",
      portalType: "learn",
      brandId: null,
      centerId: null,
      brandSlug: "smart-brain-abacus",
      centerSlug: null,
    };
    expect(needsBrandPortalBranding(learnTenant)).toBe(true);
    expect(needsPortalScopeIds(learnTenant)).toBe(true);

    const merged = mergePortalBrandingScope(learnTenant, {
      brandId: "c0000000-0000-4000-8000-000000000011",
      brandSlug: "smart-brain-abacus",
      brandName: "Smart Brain Abacus",
      brandLogoUrl: null,
      centerId: null,
      centerSlug: null,
      centerName: null,
      loginHeadline: null,
      loginSubtext: null,
    });
    expect(merged.brandId).toBe("c0000000-0000-4000-8000-000000000011");
    expect(needsPortalScopeIds(merged)).toBe(false);
  });

  it("regression_custom_domain_mapping_loads_real_brand_slug_not_hostname_label", async () => {
    const fromHost: TenantContext = {
      hostname: "www.smartbraineducations.com",
      portalType: "brand",
      brandId: SMART_BRAIN_BRAND_ID,
      centerId: null,
      brandSlug: "smartbraineducations",
      centerSlug: "www",
    };

    const supabase = {
      from: (table: string) => {
        if (table !== "brands") throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { slug: "smart-brain-abacus" }, error: null }),
            }),
          }),
        };
      },
    };

    const resolved = await resolveSlugsFromDomainMapping(supabase as never, fromHost);

    expect(resolved.brandSlug).toBe("smart-brain-abacus");
    expect(resolved.centerSlug).toBeNull();
    expect(resolved.centerId).toBeNull();
    expect(resolved.portalType).toBe("brand");
  });

  it("regression_custom_apex_domain_scope_uses_mapped_brand_slug", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        brand_id: SMART_BRAIN_BRAND_ID,
        brand_slug: "smart-brain-abacus",
        brand_name: "Smart Brain Abacus",
        brand_logo_url: null,
        center_id: null,
        center_slug: null,
        center_name: null,
        login_headline: null,
        login_subtext: null,
      },
      error: null,
    });

    const supabase = {
      from: (table: string) => {
        if (table === "domain_mappings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    hostname: "smartbraineducations.com",
                    portal_type: "brand",
                    brand_id: SMART_BRAIN_BRAND_ID,
                    center_id: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "brands") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { slug: "smart-brain-abacus" }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      rpc,
    };

    const tenant = await resolveTenantScope(supabase as never, "smartbraineducations.com");

    expect(tenant.portalType).toBe("brand");
    expect(tenant.brandSlug).toBe("smart-brain-abacus");
    expect(tenant.brandId).toBe(SMART_BRAIN_BRAND_ID);
    expect(tenant.centerSlug).toBeNull();
    expect(rpc).toHaveBeenCalledWith("get_portal_branding", {
      p_brand_slug: "smart-brain-abacus",
      p_center_slug: null,
    });
  });
});
