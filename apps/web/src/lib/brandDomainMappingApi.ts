import { getSupabase } from "@/lib/supabase";

export type BrandDomainMappingRow = {
  hostname: string;
  portal_type: string;
  is_primary: boolean;
};

/** Client-side normalize aligned with normalize_brand_domain_hostname RPC. */
export function normalizeBrandDomainHostname(raw: string): string {
  let v = raw.trim().toLowerCase();
  v = v.replace(/^https?:\/\//i, "");
  v = v.split("/")[0] ?? "";
  v = v.split("?")[0] ?? "";
  v = v.split("#")[0] ?? "";
  v = v.replace(/:\d+$/, "");
  v = v.replace(/\.$/, "").trim();
  return v;
}

export function isValidBrandDomainHostname(hostname: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(hostname);
}

export async function upsertBrandDomainMapping(input: {
  brandId: string;
  hostname: string;
  isPrimary?: boolean;
}): Promise<BrandDomainMappingRow> {
  const hostname = normalizeBrandDomainHostname(input.hostname);
  if (!isValidBrandDomainHostname(hostname)) {
    throw new Error("Enter a valid hostname like www.example.com");
  }
  const { data, error } = await getSupabase().rpc("upsert_brand_domain_mapping", {
    p_brand_id: input.brandId,
    p_hostname: hostname,
    p_is_primary: Boolean(input.isPrimary),
  });
  if (error) throw error;
  const row = data as BrandDomainMappingRow | BrandDomainMappingRow[] | null;
  const mapped = Array.isArray(row) ? row[0] : row;
  if (!mapped?.hostname) throw new Error("Domain mapping save failed");
  return {
    hostname: String(mapped.hostname),
    portal_type: String(mapped.portal_type ?? "brand"),
    is_primary: Boolean(mapped.is_primary),
  };
}

export async function deleteBrandDomainMapping(input: {
  brandId: string;
  hostname: string;
}): Promise<void> {
  const hostname = normalizeBrandDomainHostname(input.hostname);
  const { error } = await getSupabase().rpc("delete_brand_domain_mapping", {
    p_brand_id: input.brandId,
    p_hostname: hostname,
  });
  if (error) throw error;
}

export function isRemovableBrandDomain(row: BrandDomainMappingRow): boolean {
  return row.portal_type === "brand";
}

/** Seed / local Vite hosts — keep out of the “purchased domain” list. */
export function isLocalDevDomainHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().split(":")[0] ?? "";
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

export function partitionBrandDomainMappings(domains: BrandDomainMappingRow[]): {
  custom: BrandDomainMappingRow[];
  local: BrandDomainMappingRow[];
} {
  const custom: BrandDomainMappingRow[] = [];
  const local: BrandDomainMappingRow[] = [];
  for (const row of domains) {
    if (isLocalDevDomainHostname(row.hostname)) local.push(row);
    else custom.push(row);
  }
  return { custom, local };
}
