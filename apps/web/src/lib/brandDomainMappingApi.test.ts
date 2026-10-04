import { describe, expect, it } from "vitest";
import {
  isRemovableBrandDomain,
  isValidBrandDomainHostname,
  normalizeBrandDomainHostname,
  partitionBrandDomainMappings,
} from "./brandDomainMappingApi";

describe("brandDomainMappingApi", () => {
  it("regression_normalizes_pasted_brand_domain_urls", () => {
    expect(normalizeBrandDomainHostname("https://WWW.Example.com/path?x=1")).toBe("www.example.com");
    expect(normalizeBrandDomainHostname("www.smartbraineducations.com.")).toBe(
      "www.smartbraineducations.com"
    );
    expect(normalizeBrandDomainHostname("dev.smartbraineducations.com:443")).toBe(
      "dev.smartbraineducations.com"
    );
  });

  it("regression_rejects_invalid_brand_domain_hostnames", () => {
    expect(isValidBrandDomainHostname("localhost")).toBe(false);
    expect(isValidBrandDomainHostname("www.example.com")).toBe(true);
    expect(isValidBrandDomainHostname("not a host")).toBe(false);
  });

  it("regression_only_brand_portal_rows_are_removable_from_domains_ui", () => {
    expect(isRemovableBrandDomain({ hostname: "www.x.com", portal_type: "brand", is_primary: true })).toBe(
      true
    );
    expect(
      isRemovableBrandDomain({ hostname: "c.brand.localhost", portal_type: "center", is_primary: false })
    ).toBe(false);
  });

  it("regression_partitions_custom_domains_from_localhost_seed_hosts", () => {
    const { custom, local } = partitionBrandDomainMappings([
      { hostname: "www.smartbraineducations.com", portal_type: "brand", is_primary: true },
      { hostname: "smart-brain-abacus.localhost", portal_type: "brand", is_primary: false },
      { hostname: "pune.smart-brain-abacus.localhost", portal_type: "center", is_primary: false },
    ]);
    expect(custom.map((d) => d.hostname)).toEqual(["www.smartbraineducations.com"]);
    expect(local).toHaveLength(2);
  });
});
