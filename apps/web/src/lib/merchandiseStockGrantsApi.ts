import { getSupabase } from "@/lib/supabase";
import { supabaseList } from "@/lib/supabaseResult";

export type MerchandiseStockGrantRow = {
  id: string;
  brand_id: string;
  center_id: string;
  catalog_item_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  center_label: string;
  catalog_sku: string;
  catalog_name: string;
};

export type CenterStockGrantTotal = {
  catalogItemId: string;
  quantity: number;
};

type GrantListRow = {
  id: string;
  brand_id: string;
  center_id: string;
  catalog_item_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  franchise_centers:
    | { name: string; display_name: string | null }
    | { name: string; display_name: string | null }[]
    | null;
  merchandise_catalog:
    | { sku: string; name: string }
    | { sku: string; name: string }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapGrantRow(row: GrantListRow): MerchandiseStockGrantRow {
  const center = firstRelation(row.franchise_centers);
  const catalog = firstRelation(row.merchandise_catalog);
  return {
    id: row.id,
    brand_id: row.brand_id,
    center_id: row.center_id,
    catalog_item_id: row.catalog_item_id,
    quantity: row.quantity,
    note: row.note,
    created_at: row.created_at,
    center_label: center?.display_name?.trim() || center?.name || row.center_id.slice(0, 8),
    catalog_sku: catalog?.sku ?? "",
    catalog_name: catalog?.name ?? "Item",
  };
}

export async function listBrandMerchandiseStockGrants(
  brandId: string
): Promise<MerchandiseStockGrantRow[]> {
  const { data, error } = await getSupabase()
    .from("merchandise_stock_grants")
    .select(
      "id, brand_id, center_id, catalog_item_id, quantity, note, created_at, franchise_centers(name, display_name), merchandise_catalog(sku, name)"
    )
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  return supabaseList(data, error).map((row) => mapGrantRow(row as GrantListRow));
}

/** Sum brand grants for one franchise (feeds center Inventory on-hand). */
export async function fetchCenterMerchandiseStockGrantTotals(
  centerId: string
): Promise<CenterStockGrantTotal[]> {
  const { data, error } = await getSupabase()
    .from("merchandise_stock_grants")
    .select("catalog_item_id, quantity")
    .eq("center_id", centerId);
  const rows = supabaseList(data, error) as { catalog_item_id: string; quantity: number }[];
  const byItem = new Map<string, number>();
  for (const row of rows) {
    byItem.set(row.catalog_item_id, (byItem.get(row.catalog_item_id) ?? 0) + row.quantity);
  }
  return [...byItem.entries()].map(([catalogItemId, quantity]) => ({ catalogItemId, quantity }));
}

export async function grantCenterMerchandiseStock(input: {
  brandId: string;
  centerId: string;
  catalogItemId: string;
  quantity: number;
  note?: string;
}): Promise<string> {
  const { data, error } = await getSupabase().rpc("grant_center_merchandise_stock", {
    p_brand_id: input.brandId,
    p_center_id: input.centerId,
    p_catalog_item_id: input.catalogItemId,
    p_quantity: input.quantity,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return String(data);
}

export async function updateMerchandiseStockGrant(input: {
  grantId: string;
  centerId: string;
  catalogItemId: string;
  quantity: number;
  note?: string;
}): Promise<void> {
  const { error } = await getSupabase().rpc("update_merchandise_stock_grant", {
    p_grant_id: input.grantId,
    p_center_id: input.centerId,
    p_catalog_item_id: input.catalogItemId,
    p_quantity: input.quantity,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteMerchandiseStockGrant(grantId: string): Promise<void> {
  const { error } = await getSupabase().rpc("delete_merchandise_stock_grant", {
    p_grant_id: grantId,
  });
  if (error) throw error;
}

export function matchesStockGrantSearch(row: MerchandiseStockGrantRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.center_label, row.catalog_sku, row.catalog_name, row.note ?? "", String(row.quantity)]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function filterMerchandiseStockGrants(
  rows: MerchandiseStockGrantRow[],
  search = ""
): MerchandiseStockGrantRow[] {
  return rows.filter((row) => matchesStockGrantSearch(row, search));
}

export function formatStockGrantWhen(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
