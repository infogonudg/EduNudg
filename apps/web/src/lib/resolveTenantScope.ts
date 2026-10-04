import {
  mergeDomainMapping,
  resolveTenantFromHost,
  type DomainMappingRow,
  type PortalType,
  type TenantContext,
} from "@edunudg/tenant";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parsePortalBrandingRpc,
  seedPortalBrandingCache,
  type PortalBranding,
} from "@/lib/portalBranding";

const inflightTenantScope = new Map<string, Promise<TenantContext>>();

function slugMatches(actual: string | null | undefined, expected: string | null | undefined): boolean {
  if (!actual || !expected) return false;
  return actual.toLowerCase() === expected.toLowerCase();
}

export function isBrandOrCenterPortal(tenant: TenantContext): boolean {
  return tenant.portalType === "brand" || tenant.portalType === "center";
}

/** Brand / center / learn / parents all need brand_id for scoped RPCs. */
export function needsBrandPortalBranding(tenant: TenantContext): boolean {
  return (
    Boolean(tenant.brandSlug) &&
    (tenant.portalType === "brand" ||
      tenant.portalType === "center" ||
      tenant.portalType === "learn" ||
      tenant.portalType === "parents")
  );
}

export function needsPortalScopeIds(tenant: TenantContext): boolean {
  if (!tenant.brandSlug) return false;
  if (tenant.portalType === "brand") return !tenant.brandId;
  if (tenant.portalType === "center") return !tenant.brandId || !tenant.centerId;
  if (tenant.portalType === "learn" || tenant.portalType === "parents") return !tenant.brandId;
  return false;
}

/**
 * Hostname slug is authoritative for which brand/center the user is on.
 * Prefer slug-resolved IDs from get_portal_branding over stale domain_mappings rows.
 */
export function mergePortalBrandingScope(tenant: TenantContext, branding: PortalBranding): TenantContext {
  const brandFromSlug =
    slugMatches(branding.brandSlug, tenant.brandSlug) && branding.brandId ? branding.brandId : null;

  const centerFromSlug =
    tenant.portalType === "center" &&
    slugMatches(branding.centerSlug, tenant.centerSlug) &&
    branding.centerId
      ? branding.centerId
      : null;

  return {
    ...tenant,
    brandId: brandFromSlug ?? tenant.brandId ?? branding.brandId ?? null,
    centerId: centerFromSlug ?? tenant.centerId ?? branding.centerId ?? null,
  };
}

type HostnameTenantRpc = {
  hostname?: string;
  portal_type?: string;
  brand_id?: string | null;
  center_id?: string | null;
  brand_slug?: string | null;
  center_slug?: string | null;
};

const PORTAL_TYPES = new Set<PortalType>(["platform", "brand", "center", "learn", "parents"]);

/** Apply SECURITY DEFINER hostname RPC (works for anon; brands RLS blocks direct slug SELECT). */
export function applyHostnameTenantRpc(
  base: TenantContext,
  raw: HostnameTenantRpc | null | undefined
): TenantContext | null {
  if (!raw?.portal_type || !PORTAL_TYPES.has(raw.portal_type as PortalType)) return null;
  const portalType = raw.portal_type as PortalType;
  const brandSlug = raw.brand_slug?.trim().toLowerCase() || null;
  if (!brandSlug && portalType !== "platform") return null;

  return {
    ...base,
    portalType,
    brandId: raw.brand_id ?? null,
    centerId: portalType === "brand" ? null : (raw.center_id ?? null),
    brandSlug,
    centerSlug: portalType === "brand" ? null : (raw.center_slug?.trim().toLowerCase() || null),
  };
}

/**
 * Custom domains must not keep a hostname-derived brandSlug like "smartbraineducations".
 * Prefer resolve_hostname_tenant RPC; fall back to brands SELECT when authenticated.
 */
export async function resolveSlugsFromDomainMapping(
  supabase: SupabaseClient,
  tenant: TenantContext
): Promise<TenantContext> {
  let next = { ...tenant };

  if (next.brandId) {
    const { data: brand, error } = await supabase
      .from("brands")
      .select("slug")
      .eq("id", next.brandId)
      .maybeSingle();
    if (!error && brand?.slug) {
      next = { ...next, brandSlug: String(brand.slug).toLowerCase() };
    }
  }

  if (next.portalType === "brand") {
    return { ...next, centerId: null, centerSlug: null };
  }

  if (next.centerId) {
    const { data: center, error } = await supabase
      .from("franchise_centers")
      .select("slug")
      .eq("id", next.centerId)
      .maybeSingle();
    if (!error && center?.slug) {
      next = { ...next, centerSlug: String(center.slug).toLowerCase() };
    }
  }

  return next;
}

async function resolveTenantScopeOnce(
  supabase: SupabaseClient,
  hostname: string
): Promise<TenantContext> {
  const base = resolveTenantFromHost(hostname);

  try {
    const { data: hostnameTenant, error: hostnameError } = await supabase.rpc("resolve_hostname_tenant", {
      p_hostname: base.hostname,
    });

    if (!hostnameError && hostnameTenant) {
      const fromRpc = applyHostnameTenantRpc(
        base,
        hostnameTenant as HostnameTenantRpc
      );
      if (fromRpc) {
        const brandSlug = fromRpc.brandSlug;
        if (!brandSlug || !needsBrandPortalBranding(fromRpc)) return fromRpc;

        const { data, error } = await supabase.rpc("get_portal_branding", {
          p_brand_slug: brandSlug,
          p_center_slug: fromRpc.centerSlug,
        });
        if (error) return fromRpc;

        const branding = parsePortalBrandingRpc(data);
        seedPortalBrandingCache(brandSlug, fromRpc.centerSlug, branding);
        return mergePortalBrandingScope(fromRpc, branding);
      }
    }

    const { data: mapping, error: mappingError } = await supabase
      .from("domain_mappings")
      .select("hostname, portal_type, brand_id, center_id")
      .eq("hostname", base.hostname)
      .maybeSingle();

    let tenant = mappingError
      ? base
      : mergeDomainMapping(base, mapping as DomainMappingRow | null);

    if (mapping && !mappingError) {
      tenant = await resolveSlugsFromDomainMapping(supabase, tenant);
    }

    const brandSlug = tenant.brandSlug;
    if (!brandSlug || !needsBrandPortalBranding(tenant)) return tenant;

    const { data, error } = await supabase.rpc("get_portal_branding", {
      p_brand_slug: brandSlug,
      p_center_slug: tenant.centerSlug,
    });

    if (error) return tenant;

    const branding = parsePortalBrandingRpc(data);
    seedPortalBrandingCache(brandSlug, tenant.centerSlug, branding);
    tenant = mergePortalBrandingScope(tenant, branding);

    return tenant;
  } catch {
    return base;
  }
}

/** Resolve hostname tenant: domain mapping for portal type, then slug-based get_portal_branding RPC. */
export async function resolveTenantScope(
  supabase: SupabaseClient,
  hostname: string
): Promise<TenantContext> {
  const inflight = inflightTenantScope.get(hostname);
  if (inflight) return inflight;

  const promise = resolveTenantScopeOnce(supabase, hostname).finally(() => {
    inflightTenantScope.delete(hostname);
  });
  inflightTenantScope.set(hostname, promise);
  return promise;
}
