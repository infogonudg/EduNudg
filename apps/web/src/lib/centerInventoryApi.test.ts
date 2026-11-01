import { describe, expect, it } from "vitest";
import {
  buildCatalogItemOrderHistory,
  buildCenterInventorySummary,
  buildIncomingOrderLines,
  computeInventoryValueCents,
  computeInventoryValueTrendPercent,
  countLowStockItems,
  filterCenterInventory,
  inventoryPageCounts,
  inventoryStockBadge,
  inventorySummaryToCsv,
  orderHistorySinceMonths,
  type InventoryCatalogItem,
  type InventorySummaryRow,
} from "@/lib/centerInventoryApi";
import type { MerchandiseOrderRow } from "@/lib/merchandiseOrdersApi";

const catalog: InventoryCatalogItem[] = [
  { catalogItemId: "item-a", sku: "BOOK-1", name: "Level 1 Book", priceCents: 50000, photoUrl: null },
  { catalogItemId: "item-b", sku: "KIT-1", name: "Starter Kit", priceCents: 120000, photoUrl: null },
];

function order(
  partial: Partial<MerchandiseOrderRow> & Pick<MerchandiseOrderRow, "id" | "status" | "created_at">
): MerchandiseOrderRow {
  return {
    center_id: "center-1",
    payment_status: "paid",
    payment_method: "invoice",
    shipping_mode: "franchise",
    shipping_address: {},
    shipping_tracking: {},
    subtotal_cents: 0,
    discount_cents: 0,
    total_cents: 0,
    merchandise_order_lines: [],
    ...partial,
  };
}

describe("centerInventoryApi", () => {
  it("buildCenterInventorySummary tracks on-hand, incoming, and allocated bulk stock", () => {
    const orders: MerchandiseOrderRow[] = [
      order({
        id: "o1",
        status: "received",
        created_at: "2026-01-10T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-1",
            catalog_item_id: "item-a",
            quantity: 10,
            unit_price_cents: 50000,
            student_id: null,
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
      order({
        id: "o2",
        status: "shipped",
        created_at: "2026-02-01T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-2",
            catalog_item_id: "item-a",
            quantity: 5,
            unit_price_cents: 50000,
            student_id: null,
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
      order({
        id: "o3",
        status: "complete",
        created_at: "2026-01-05T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-3",
            catalog_item_id: "item-b",
            quantity: 3,
            unit_price_cents: 120000,
            student_id: null,
            merchandise_catalog: { name: "Starter Kit", sku: "KIT-1" },
          },
        ],
      }),
      order({
        id: "o4",
        status: "received",
        created_at: "2026-01-15T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-student",
            catalog_item_id: "item-a",
            quantity: 2,
            unit_price_cents: 50000,
            student_id: "student-1",
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
    ];

    const summary = buildCenterInventorySummary({
      catalog,
      orders,
      allocatedLineIds: new Set(["line-1"]),
    });

    const book = summary.find((row) => row.catalogItemId === "item-a");
    const kit = summary.find((row) => row.catalogItemId === "item-b");

    expect(book).toMatchObject({ onHand: 10, incoming: 5, allocated: 10, available: 0 });
    expect(kit).toMatchObject({ onHand: 3, incoming: 0, allocated: 0, available: 3 });
  });

  it("regression_inventory_includes_brand_stock_grants_in_on_hand", () => {
    const summary = buildCenterInventorySummary({
      catalog,
      orders: [],
      allocatedLineIds: new Set(),
      stockGrants: [
        { catalogItemId: "item-a", quantity: 7 },
        { catalogItemId: "item-a", quantity: 3 },
        { catalogItemId: "item-b", quantity: 2 },
      ],
    });

    expect(summary.find((row) => row.catalogItemId === "item-a")).toMatchObject({
      onHand: 10,
      available: 10,
      incoming: 0,
    });
    expect(summary.find((row) => row.catalogItemId === "item-b")).toMatchObject({
      onHand: 2,
      available: 2,
    });
  });

  it("regression_inventory_omits_skus_not_in_assigned_catalog", () => {
    const summary = buildCenterInventorySummary({
      catalog: [catalog[0]!],
      orders: [
        order({
          id: "other-course",
          status: "received",
          created_at: "2026-01-10T00:00:00Z",
          merchandise_order_lines: [
            {
              id: "line-other",
              catalog_item_id: "item-b",
              quantity: 8,
              unit_price_cents: 120000,
              student_id: null,
              merchandise_catalog: { name: "Starter Kit", sku: "KIT-1" },
            },
          ],
        }),
      ],
      allocatedLineIds: new Set(),
    });
    expect(summary.map((row) => row.catalogItemId)).toEqual(["item-a"]);
    expect(summary.find((row) => row.catalogItemId === "item-b")).toBeUndefined();
  });

  it("regression_buildCenterInventorySummary_ignores_cancelled_orders", () => {
    const summary = buildCenterInventorySummary({
      catalog,
      orders: [
        order({
          id: "cancelled",
          status: "cancelled",
          created_at: "2026-03-01T00:00:00Z",
          merchandise_order_lines: [
            {
              id: "line-x",
              catalog_item_id: "item-a",
              quantity: 99,
              unit_price_cents: 100,
              student_id: null,
              merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
            },
          ],
        }),
      ],
      allocatedLineIds: new Set(),
    });

    expect(summary.find((row) => row.catalogItemId === "item-a")).toMatchObject({
      onHand: 0,
      incoming: 0,
      available: 0,
    });
  });

  it("buildCatalogItemOrderHistory filters by catalog item and date window", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const orders: MerchandiseOrderRow[] = [
      order({
        id: "recent",
        status: "placed",
        created_at: "2026-02-15T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-1",
            catalog_item_id: "item-a",
            quantity: 4,
            unit_price_cents: 50000,
            student_id: null,
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
      order({
        id: "old",
        status: "complete",
        created_at: "2025-06-01T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-old",
            catalog_item_id: "item-a",
            quantity: 1,
            unit_price_cents: 50000,
            student_id: null,
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
    ];

    const history = buildCatalogItemOrderHistory(orders, "item-a", since);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ orderId: "recent", quantity: 4 });
  });

  it("buildIncomingOrderLines lists only pending bulk lines", () => {
    const orders: MerchandiseOrderRow[] = [
      order({
        id: "incoming",
        status: "approved",
        created_at: "2026-03-01T00:00:00Z",
        merchandise_order_lines: [
          {
            id: "line-1",
            catalog_item_id: "item-a",
            quantity: 7,
            unit_price_cents: 50000,
            student_id: null,
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
          {
            id: "line-2",
            catalog_item_id: "item-a",
            quantity: 2,
            unit_price_cents: 50000,
            student_id: "student-1",
            merchandise_catalog: { name: "Level 1 Book", sku: "BOOK-1" },
          },
        ],
      }),
    ];

    const incoming = buildIncomingOrderLines(orders, "item-a");
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({ orderId: "incoming", quantity: 7, orderStatus: "approved" });
  });

  it("computeInventoryValueCents sums on-hand value", () => {
    expect(
      computeInventoryValueCents([
        {
          catalogItemId: "a",
          sku: "A",
          name: "A",
          priceCents: 10000,
          photoUrl: null,
          onHand: 3,
          incoming: 0,
          allocated: 0,
          available: 3,
        },
      ])
    ).toBe(30000);
  });

  it("computeInventoryValueTrendPercent returns growth from recent receipts", () => {
    const rows = [
      {
        catalogItemId: "a",
        sku: "A",
        name: "A",
        priceCents: 10000,
        photoUrl: null,
        onHand: 10,
        incoming: 0,
        allocated: 0,
        available: 10,
      },
    ];
    const orders = [
      order({
        id: "recent",
        status: "received",
        created_at: new Date().toISOString(),
        merchandise_order_lines: [
          {
            id: "line-1",
            catalog_item_id: "a",
            quantity: 2,
            unit_price_cents: 10000,
            student_id: null,
            merchandise_catalog: { name: "A", sku: "A" },
          },
        ],
      }),
    ];
    expect(computeInventoryValueTrendPercent(rows, orders)).toBe(25);
  });

  it("inventorySummaryToCsv escapes commas and quotes", () => {
    const csv = inventorySummaryToCsv([
      {
        catalogItemId: "item-a",
        sku: "BOOK,1",
        name: 'Level "1" Book',
        priceCents: 50000,
        photoUrl: null,
        onHand: 2,
        incoming: 1,
        allocated: 0,
        available: 2,
      },
    ]);

    expect(csv).toContain('"BOOK,1"');
    expect(csv).toContain('"Level ""1"" Book"');
  });

  it("inventorySummaryToCsv includes curriculum and program", () => {
    const csv = inventorySummaryToCsv([
      {
        catalogItemId: "item-a",
        sku: "BOOK-1",
        name: "Level 1 Book",
        priceCents: 50000,
        photoUrl: null,
        courseNames: ["Abacus Core"],
        levelNames: ["Level 1"],
        onHand: 2,
        incoming: 1,
        allocated: 0,
        available: 2,
      },
    ]);
    expect(csv.split("\n")[0]).toBe("SKU,Name,Curriculum,Program,On hand,Allocated,Available,Incoming");
    expect(csv).toContain("Abacus Core,Level 1");
  });

  it("filterCenterInventory search matches curriculum names", () => {
    const rows: InventorySummaryRow[] = [
      {
        catalogItemId: "item-a",
        sku: "BOOK-1",
        name: "Level 1 Book",
        priceCents: 50000,
        photoUrl: null,
        courseNames: ["Abacus Core"],
        levelNames: ["Level 1"],
        onHand: 10,
        incoming: 0,
        allocated: 2,
        available: 8,
      },
      {
        catalogItemId: "item-b",
        sku: "KIT-1",
        name: "Starter Kit",
        priceCents: 120000,
        photoUrl: null,
        courseNames: ["Vedic Maths"],
        levelNames: ["Junior"],
        onHand: 2,
        incoming: 4,
        allocated: 0,
        available: 2,
      },
    ];
    expect(filterCenterInventory(rows, "all", "abacus", 5).map((row) => row.catalogItemId)).toEqual(["item-a"]);
    expect(filterCenterInventory(rows, "all", "junior", 5).map((row) => row.catalogItemId)).toEqual(["item-b"]);
  });

  it("countLowStockItems uses available quantity", () => {
    expect(
      countLowStockItems(
        [
          {
            catalogItemId: "a",
            sku: "A",
            name: "A",
            priceCents: 10000,
            photoUrl: null,
            onHand: 10,
            incoming: 0,
            allocated: 8,
            available: 2,
          },
          {
            catalogItemId: "b",
            sku: "B",
            name: "B",
            priceCents: 10000,
            photoUrl: null,
            onHand: 20,
            incoming: 0,
            allocated: 0,
            available: 20,
          },
        ],
        5
      )
    ).toBe(1);
  });

  it("orderHistorySinceMonths subtracts months from reference date", () => {
    const since = orderHistorySinceMonths(6, new Date("2026-06-15T12:00:00Z"));
    expect(since.getFullYear()).toBe(2025);
    expect(since.getMonth()).toBe(11);
  });

  it("inventoryPageCounts splits in-stock, low, incoming, and total", () => {
    const rows: InventorySummaryRow[] = [
      {
        catalogItemId: "item-a",
        sku: "BOOK-1",
        name: "Level 1 Book",
        priceCents: 50000,
        photoUrl: null,
        onHand: 10,
        incoming: 0,
        allocated: 2,
        available: 8,
      },
      {
        catalogItemId: "item-b",
        sku: "KIT-1",
        name: "Starter Kit",
        priceCents: 120000,
        photoUrl: null,
        onHand: 2,
        incoming: 4,
        allocated: 0,
        available: 2,
      },
    ];
    expect(inventoryPageCounts(rows, 5)).toEqual({ inStock: 1, lowStock: 1, incoming: 1, total: 2 });
    expect(filterCenterInventory(rows, "in_stock", "", 5).map((row) => row.catalogItemId)).toEqual(["item-a"]);
    expect(filterCenterInventory(rows, "low", "starter", 5)).toHaveLength(1);
    expect(inventoryStockBadge(rows[0]!, 5).label).toBe("IN STOCK");
    expect(inventoryStockBadge(rows[1]!, 5).label).toBe("LOW STOCK");
  });
});
