import type { MerchandiseBrandSettings } from "@/lib/merchandiseSettingsApi";
import type { MerchandiseOrderRow } from "@/lib/merchandiseOrdersApi";

export type CatalogTabFilter = "all" | "active" | "draft";
export type MerchandiseSectionTab = "catalog" | "promo" | "orders" | "inventory" | "payment";

export type MerchandiseCatalogCountRow = {
  sku: string;
  name: string;
  is_active: boolean;
};

export type MerchandisePromoRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_quantity: number;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
};

export type MerchandiseInvoiceSnapshot = {
  id: string;
  invoice_number: string;
  status: string;
  due_at: string;
};

export type OrderEditForm = {
  status: string;
  carrier: string;
  trackingNumber: string;
};

export type PaymentSettingGroupId = "mode" | "razorpay" | "invoice" | "reminders";

export type PaymentSettingGroup = {
  id: PaymentSettingGroupId;
  title: string;
  badge: string;
  badgeTone: "approved" | "pending" | "neutral";
  detail: string;
  searchText: string;
};

const BRAND_EDITABLE_ORDER_STATUSES = ["placed", "approved", "shipped", "cancelled"] as const;

export function matchesTextSearch(values: Array<string | null | undefined>, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return values
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function merchandiseCatalogCounts(items: MerchandiseCatalogCountRow[]) {
  const active = items.filter((item) => item.is_active).length;
  const draft = items.filter((item) => !item.is_active).length;
  return { active, draft, total: items.length };
}

export function merchandisePageCounts(items: MerchandiseCatalogCountRow[], orderCount: number) {
  return { ...merchandiseCatalogCounts(items), orders: orderCount };
}

export function merchandiseSearchPlaceholder(tab: MerchandiseSectionTab): string {
  if (tab === "promo") return "Search promo codes...";
  if (tab === "orders") return "Search orders...";
  if (tab === "inventory") return "Search stock grants...";
  if (tab === "payment") return "Search payment settings...";
  return "Search catalog...";
}

export function merchandiseSearchAriaLabel(tab: MerchandiseSectionTab): string {
  if (tab === "promo") return "Search promo codes";
  if (tab === "orders") return "Search orders";
  if (tab === "inventory") return "Search stock grants";
  if (tab === "payment") return "Search payment settings";
  return "Search catalog";
}

export function matchesMerchandiseSearch(item: MerchandiseCatalogCountRow, search: string) {
  return matchesTextSearch([item.name, item.sku], search);
}

export function filterMerchandiseCatalog<T extends MerchandiseCatalogCountRow>(
  items: T[],
  filter: CatalogTabFilter,
  search = "",
): T[] {
  return items.filter((item) => {
    if (filter === "active" && !item.is_active) return false;
    if (filter === "draft" && item.is_active) return false;
    return matchesMerchandiseSearch(item, search);
  });
}

export function promoDiscountLabel(row: Pick<MerchandisePromoRow, "discount_type" | "discount_value">): string {
  return row.discount_type === "percent"
    ? `${row.discount_value}% off`
    : `₹${(row.discount_value / 100).toFixed(2)} off`;
}

export function promoUsesLabel(row: Pick<MerchandisePromoRow, "max_uses" | "use_count" | "min_quantity">): string {
  const uses =
    row.max_uses != null ? `${row.use_count}/${row.max_uses} uses` : `${row.use_count} uses`;
  return `min qty ${row.min_quantity} · ${uses}`;
}

export function filterMerchandisePromos<T extends MerchandisePromoRow>(items: T[], search = ""): T[] {
  return items.filter((item) =>
    matchesTextSearch([item.code, item.description, promoDiscountLabel(item), item.is_active ? "active" : "inactive"], search),
  );
}

export function merchandiseOrderCenterLabel(order: Pick<MerchandiseOrderRow, "franchise_centers" | "center_id">): string {
  const center = Array.isArray(order.franchise_centers)
    ? order.franchise_centers[0]
    : order.franchise_centers;
  return center?.display_name ?? center?.name ?? order.center_id.slice(0, 8);
}

export function firstMerchandiseInvoice(
  order: Pick<MerchandiseOrderRow, "merchandise_invoices">,
): MerchandiseInvoiceSnapshot | null {
  const inv = order.merchandise_invoices;
  if (!inv) return null;
  return (Array.isArray(inv) ? inv[0] : inv) ?? null;
}

export function merchandiseOrderLineLabel(
  line: MerchandiseOrderRow["merchandise_order_lines"][number],
): string {
  const catalog = Array.isArray(line.merchandise_catalog)
    ? line.merchandise_catalog[0]
    : line.merchandise_catalog;
  return `${catalog?.name ?? "Item"} × ${line.quantity}`;
}

export function isOverdueMerchandisePayment(order: MerchandiseOrderRow): boolean {
  if (order.payment_status === "paid") return false;
  const inv = firstMerchandiseInvoice(order);
  if (!inv || inv.status === "paid") return false;
  return new Date(inv.due_at) < new Date();
}

export function merchandiseOrderTracking(order: Pick<MerchandiseOrderRow, "shipping_tracking">): {
  carrier: string;
  trackingNumber: string;
} {
  const tracking = order.shipping_tracking ?? {};
  return {
    carrier: typeof tracking.carrier === "string" ? tracking.carrier : "",
    trackingNumber: typeof tracking.tracking_number === "string" ? tracking.tracking_number : "",
  };
}

export function orderToEditForm(order: MerchandiseOrderRow): OrderEditForm {
  const tracking = merchandiseOrderTracking(order);
  const editableStatus = (BRAND_EDITABLE_ORDER_STATUSES as readonly string[]).includes(order.status)
    ? order.status
    : order.status === "awaiting_payment"
      ? "placed"
      : order.status === "received" || order.status === "complete"
        ? "shipped"
        : "placed";
  return {
    status: editableStatus,
    carrier: tracking.carrier,
    trackingNumber: tracking.trackingNumber,
  };
}

export function filterMerchandiseOrders(
  orders: MerchandiseOrderRow[],
  search = "",
  overdueOnly = false,
): MerchandiseOrderRow[] {
  return orders.filter((order) => {
    if (overdueOnly && !isOverdueMerchandisePayment(order)) return false;
    return matchesTextSearch(
      [merchandiseOrderCenterLabel(order), order.status, order.payment_status, order.id],
      search,
    );
  });
}

export function merchandiseOrderListBadge(order: MerchandiseOrderRow): {
  label: string;
  tone: "approved" | "pending" | "rejected";
} {
  if (order.status === "cancelled") return { label: "Cancelled", tone: "rejected" };
  if (isOverdueMerchandisePayment(order)) return { label: "Overdue", tone: "pending" };
  if (order.status === "complete" || order.payment_status === "paid") {
    return { label: order.status === "complete" ? "Complete" : "Paid", tone: "approved" };
  }
  return { label: order.status, tone: "pending" };
}

function paymentModeLabel(mode: MerchandiseBrandSettings["payment_mode"]): string {
  if (mode === "razorpay") return "Razorpay";
  if (mode === "invoice") return "Invoice";
  return "Razorpay + invoice";
}

export function merchandisePaymentSettingGroups(form: MerchandiseBrandSettings): PaymentSettingGroup[] {
  const invoiceBits = [
    form.invoice_details.bank_name,
    form.invoice_details.account_number,
    form.invoice_details.upi_id,
  ].filter(Boolean);
  return [
    {
      id: "mode",
      title: "Payment mode",
      badge: paymentModeLabel(form.payment_mode),
      badgeTone: "approved",
      detail: form.require_payment_before_fulfillment
        ? "Pay before fulfillment"
        : "Fulfill without payment",
      searchText: `payment mode razorpay invoice ${form.payment_mode} fulfillment`,
    },
    {
      id: "razorpay",
      title: "Razorpay",
      badge: form.razorpay_key_id.trim() ? "Configured" : "Not set",
      badgeTone: form.razorpay_key_id.trim() ? "approved" : "pending",
      detail: form.razorpay_key_id.trim() || "Add a Razorpay key ID",
      searchText: `razorpay key checkout ${form.razorpay_key_id}`,
    },
    {
      id: "invoice",
      title: "Invoice details",
      badge: invoiceBits.length > 0 ? "Configured" : "Not set",
      badgeTone: invoiceBits.length > 0 ? "approved" : "pending",
      detail: form.invoice_details.bank_name?.trim() || `Due in ${form.invoice_due_days} days`,
      searchText: `invoice bank upi due ${form.invoice_due_days} ${invoiceBits.join(" ")}`,
    },
    {
      id: "reminders",
      title: "Reminders",
      badge: form.reminders.enabled ? "On" : "Off",
      badgeTone: form.reminders.enabled ? "approved" : "neutral",
      detail: form.reminders.enabled
        ? "Invoice payment reminders enabled"
        : "Reminders are turned off",
      searchText: "reminders invoice pending payment email",
    },
  ];
}

export function filterMerchandisePaymentGroups(
  groups: PaymentSettingGroup[],
  search = "",
): PaymentSettingGroup[] {
  return groups.filter((group) =>
    matchesTextSearch([group.title, group.badge, group.detail, group.searchText], search),
  );
}
