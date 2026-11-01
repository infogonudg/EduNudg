import { describe, expect, it } from "vitest";
import {
  filterMerchandiseStockGrants,
  formatStockGrantWhen,
  matchesStockGrantSearch,
  type MerchandiseStockGrantRow,
} from "@/lib/merchandiseStockGrantsApi";

const grant = (partial: Partial<MerchandiseStockGrantRow> = {}): MerchandiseStockGrantRow => ({
  id: "g1",
  brand_id: "brand-1",
  center_id: "center-1",
  catalog_item_id: "item-1",
  quantity: 5,
  note: "Seed kit",
  created_at: "2026-03-01T00:00:00Z",
  center_label: "Pune Central",
  catalog_sku: "BOOK-1",
  catalog_name: "Level 1 Book",
  ...partial,
});

describe("merchandiseStockGrantsApi", () => {
  it("regression_stock_grant_search_matches_franchise_sku_and_note", () => {
    const row = grant();
    expect(matchesStockGrantSearch(row, "pune")).toBe(true);
    expect(matchesStockGrantSearch(row, "BOOK-1")).toBe(true);
    expect(matchesStockGrantSearch(row, "seed")).toBe(true);
    expect(matchesStockGrantSearch(row, "mumbai")).toBe(false);
  });

  it("filterMerchandiseStockGrants keeps matching rows", () => {
    const rows = [grant(), grant({ id: "g2", center_label: "Mumbai West", catalog_sku: "KIT-1" })];
    expect(filterMerchandiseStockGrants(rows, "mumbai").map((row) => row.id)).toEqual(["g2"]);
  });

  it("formatStockGrantWhen returns a locale date", () => {
    expect(formatStockGrantWhen("2026-03-01T00:00:00Z")).toMatch(/2026/);
  });
});
