import { getSupabase } from "@/lib/supabase";
import { supabaseList } from "@/lib/supabaseResult";
import { activeMerchandisePhotoUrls } from "@/lib/merchandiseProductPhotoStorage";
import { formatCenterSkuCurriculum } from "@/lib/merchandiseCurriculum";
import {
  listActiveMerchandiseCatalog,
  listCenterMerchandiseOrders,
  type MerchandiseOrderRow,
} from "@/lib/merchandiseOrdersApi";
import {
  fetchCenterMerchandiseStockGrantTotals,
  type CenterStockGrantTotal,
} from "@/lib/merchandiseStockGrantsApi";

export const INCOMING_ORDER_STATUSES = ["awaiting_payment", "placed", "approved", "shipped"] as const;
export const RECEIVED_ORDER_STATUSES = ["received", "complete"] as const;

export type InventoryCatalogItem = {
  catalogItemId: string;
  sku: string;
  name: string;
  priceCents: number;
  photoUrl: string | null;
  courseNames?: string[];
  levelNames?: string[];
};

export type InventorySummaryRow = InventoryCatalogItem & {
  onHand: number;
  incoming: number;
  allocated: number;
  available: number;
};

export type InventoryOrderHistoryEntry = {
  orderId: string;
  orderDate: string;
  orderStatus: string;
  quantity: number;
  unitPriceCents: number;
};

export type IncomingOrderLine = {
  orderId: string;
  orderDate: string;
  orderStatus: string;
  quantity: number;
  estimatedDelivery: string | null;
};

function isBulkCenterLine(line: MerchandiseOrderRow["merchandise_order_lines"][number]) {
  return !line.student_id;
}

/** Aggregate on-hand, incoming, and available stock from orders + brand stock grants. */
export function buildCenterInventorySummary(input: {
  catalog: InventoryCatalogItem[];
  orders: MerchandiseOrderRow[];
  allocatedLineIds: Set<string>;
  stockGrants?: CenterStockGrantTotal[];
}): InventorySummaryRow[] {
  const byCatalog = new Map<string, InventorySummaryRow>();

  for (const item of input.catalog) {
    byCatalog.set(item.catalogItemId, {
      ...item,
      onHand: 0,
      incoming: 0,
      allocated: 0,
      available: 0,
    });
  }

  for (const order of input.orders) {
    if (order.status === "cancelled") continue;

    const isIncoming = INCOMING_ORDER_STATUSES.includes(
      order.status as (typeof INCOMING_ORDER_STATUSES)[number]
    );
    const isReceived = RECEIVED_ORDER_STATUSES.includes(
      order.status as (typeof RECEIVED_ORDER_STATUSES)[number]
    );

    for (const line of order.merchandise_order_lines) {
      if (!isBulkCenterLine(line)) continue;

      const row = byCatalog.get(line.catalog_item_id);
      if (!row) continue;

      if (isIncoming) {
        row.incoming += line.quantity;
      }
      if (isReceived) {
        row.onHand += line.quantity;
        if (input.allocatedLineIds.has(line.id)) {
          row.allocated += line.quantity;
        }
      }
    }
  }

  for (const grant of input.stockGrants ?? []) {
    const row = byCatalog.get(grant.catalogItemId);
    if (!row) continue;
    row.onHand += grant.quantity;
  }

  for (const row of byCatalog.values()) {
    row.available = Math.max(row.onHand - row.allocated, 0);
  }

  return [...byCatalog.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCatalogItemOrderHistory(
  orders: MerchandiseOrderRow[],
  catalogItemId: string,
  since: Date
): InventoryOrderHistoryEntry[] {
  const sinceMs = since.getTime();
  const entries: InventoryOrderHistoryEntry[] = [];

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const orderMs = new Date(order.created_at).getTime();
    if (orderMs < sinceMs) continue;

    for (const line of order.merchandise_order_lines) {
      if (line.catalog_item_id !== catalogItemId) continue;
      entries.push({
        orderId: order.id,
        orderDate: order.created_at,
        orderStatus: order.status,
        quantity: line.quantity,
        unitPriceCents: line.unit_price_cents,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

export function buildIncomingOrderLines(
  orders: MerchandiseOrderRow[],
  catalogItemId: string
): IncomingOrderLine[] {
  const lines: IncomingOrderLine[] = [];

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    if (!INCOMING_ORDER_STATUSES.includes(order.status as (typeof INCOMING_ORDER_STATUSES)[number])) {
      continue;
    }

    for (const line of order.merchandise_order_lines) {
      if (line.catalog_item_id !== catalogItemId || !isBulkCenterLine(line)) continue;
      lines.push({
        orderId: order.id,
        orderDate: order.created_at,
        orderStatus: order.status,
        quantity: line.quantity,
        estimatedDelivery: parseEstimatedDelivery(order),
      });
    }
  }

  return lines.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

function parseEstimatedDelivery(order: MerchandiseOrderRow): string | null {
  const tracking = order.shipping_tracking;
  if (tracking && typeof tracking === "object") {
    const record = tracking as Record<string, unknown>;
    const raw = record.estimated_delivery ?? record.eta ?? record.expected_delivery;
    if (typeof raw === "string" && raw.trim()) return raw;
  }
  if (order.status === "shipped") {
    const estimate = new Date(order.created_at);
    estimate.setDate(estimate.getDate() + 14);
    return estimate.toISOString();
  }
  return null;
}

export function formatEstimatedDeliveryLabel(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatPurchaseOrderLabel(orderId: string): string {
  const compact = orderId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `PO #${compact}`;
}

export function computeInventoryValueCents(rows: InventorySummaryRow[]): number {
  return rows.reduce((sum, row) => sum + row.onHand * row.priceCents, 0);
}

/** Rough month-over-month trend from value of stock received in the last 30 days. */
export function computeInventoryValueTrendPercent(
  rows: InventorySummaryRow[],
  orders: MerchandiseOrderRow[],
  now = new Date()
): number | null {
  const current = computeInventoryValueCents(rows);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  let recentReceipts = 0;
  for (const order of orders) {
    if (!RECEIVED_ORDER_STATUSES.includes(order.status as (typeof RECEIVED_ORDER_STATUSES)[number])) {
      continue;
    }
    if (new Date(order.created_at).getTime() < cutoff.getTime()) continue;
    for (const line of order.merchandise_order_lines) {
      if (!isBulkCenterLine(line)) continue;
      recentReceipts += line.quantity * line.unit_price_cents;
    }
  }

  const baseline = current - recentReceipts;
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function orderHistorySinceMonths(months: number, now = new Date()): Date {
  const since = new Date(now);
  since.setMonth(since.getMonth() - months);
  return since;
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function inventorySummaryToCsv(rows: InventorySummaryRow[]): string {
  const header = ["SKU", "Name", "Curriculum", "Program", "On hand", "Allocated", "Available", "Incoming"];
  const body = rows.map((row) => {
    const { curriculum, program } = formatCenterSkuCurriculum(row.courseNames, row.levelNames);
    return [
      row.sku,
      row.name,
      curriculum ?? "",
      program ?? "",
      row.onHand,
      row.allocated,
      row.available,
      row.incoming,
    ]
      .map(escapeCsvCell)
      .join(",");
  });
  return [header.join(","), ...body].join("\n");
}

export function downloadInventoryCsv(rows: InventorySummaryRow[], filename = "center-inventory.csv"): void {
  const csv = inventorySummaryToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fetchAllocatedBulkLineIds(centerId: string): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from("student_merchandise_allocations")
    .select("order_line_id, merchandise_order_lines!inner(student_id)")
    .eq("center_id", centerId);
  if (error) throw error;

  const rows = supabaseList(data, null) as {
    order_line_id: string | null;
    merchandise_order_lines: { student_id: string | null } | { student_id: string | null }[] | null;
  }[];

  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.order_line_id) continue;
    const line = Array.isArray(row.merchandise_order_lines)
      ? row.merchandise_order_lines[0]
      : row.merchandise_order_lines;
    // Only bulk lines (no student on line) reduce center stock
    if (line?.student_id) continue;
    ids.add(row.order_line_id);
  }
  return ids;
}

export async function fetchCenterInventorySummary(
  brandId: string,
  centerId: string
): Promise<InventorySummaryRow[]> {
  const [catalog, orders, allocatedLineIds, stockGrants] = await Promise.all([
    listActiveMerchandiseCatalog(brandId, centerId),
    listCenterMerchandiseOrders(centerId),
    fetchAllocatedBulkLineIds(centerId),
    fetchCenterMerchandiseStockGrantTotals(centerId),
  ]);

  const catalogItems: InventoryCatalogItem[] = catalog.map((item) => ({
    catalogItemId: item.id,
    sku: item.sku,
    name: item.name,
    priceCents: item.price_cents,
    photoUrl: activeMerchandisePhotoUrls(item.photo_urls)[0] ?? null,
    courseNames: item.courseNames,
    levelNames: item.levelNames,
  }));

  const catalogMeta = new Map(catalogItems.map((item) => [item.catalogItemId, item]));

  const summary = buildCenterInventorySummary({
    catalog: catalogItems,
    orders,
    allocatedLineIds,
    stockGrants,
  });

  return summary.map((row) => {
    const meta = catalogMeta.get(row.catalogItemId);
    return meta
      ? { ...row, priceCents: meta.priceCents, photoUrl: meta.photoUrl }
      : row;
  });
}

export async function fetchInventoryValueStats(
  brandId: string,
  centerId: string
): Promise<{ totalCents: number; trendPercent: number | null }> {
  const [rows, orders] = await Promise.all([
    fetchCenterInventorySummary(brandId, centerId),
    listCenterMerchandiseOrders(centerId),
  ]);
  return {
    totalCents: computeInventoryValueCents(rows),
    trendPercent: computeInventoryValueTrendPercent(rows, orders),
  };
}

export async function fetchCatalogItemOrderHistory(
  centerId: string,
  catalogItemId: string,
  monthsBack = 6
): Promise<InventoryOrderHistoryEntry[]> {
  const orders = await listCenterMerchandiseOrders(centerId);
  return buildCatalogItemOrderHistory(orders, catalogItemId, orderHistorySinceMonths(monthsBack));
}

export async function fetchCatalogItemIncomingLines(
  centerId: string,
  catalogItemId: string
): Promise<IncomingOrderLine[]> {
  const orders = await listCenterMerchandiseOrders(centerId);
  return buildIncomingOrderLines(orders, catalogItemId);
}

/** Count SKUs at or below the low-stock threshold (available bulk stock). */
export function countLowStockItems(rows: InventorySummaryRow[], threshold: number): number {
  return rows.filter((row) => row.available <= threshold).length;
}

export type InventoryTabFilter = "all" | "in_stock" | "low";

export type InventoryPageCounts = {
  inStock: number;
  lowStock: number;
  incoming: number;
  total: number;
};

export function inventoryStockBadge(
  item: InventorySummaryRow,
  threshold: number
): { label: string; tone: "success" | "warning" } {
  if (item.available <= threshold) return { label: "LOW STOCK", tone: "warning" };
  return { label: "IN STOCK", tone: "success" };
}

export function inventoryPageCounts(rows: InventorySummaryRow[], threshold: number): InventoryPageCounts {
  return {
    inStock: rows.filter((row) => row.available > threshold).length,
    lowStock: rows.filter((row) => row.available <= threshold).length,
    incoming: rows.filter((row) => row.incoming > 0).length,
    total: rows.length,
  };
}

export function matchesInventorySearch(item: InventorySummaryRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.sku, ...(item.courseNames ?? []), ...(item.levelNames ?? [])].some((value) =>
    value.toLowerCase().includes(q)
  );
}

export function filterCenterInventory(
  rows: InventorySummaryRow[],
  filter: InventoryTabFilter,
  search: string,
  threshold: number
): InventorySummaryRow[] {
  return rows.filter((row) => {
    const matchesFilter =
      filter === "in_stock"
        ? row.available > threshold
        : filter === "low"
          ? row.available <= threshold
          : true;
    return matchesFilter && matchesInventorySearch(row, search);
  });
}
