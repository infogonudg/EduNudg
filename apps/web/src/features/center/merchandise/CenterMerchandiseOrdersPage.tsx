import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  CommerceAlertBanner,
  FilterTabs,
  FormGrid,
  Input,
  LeadKpiCard,
  LeadKpiGrid,
  MobileCartBar,
  MutationError,
  PipelinePageHeader,
  PipelineWorkspace,
  Select,
  ShippingAddressPreview,
} from "@edunudg/ui";
import { useTenant } from "@/bootstrap/TenantProvider";
import { formatInrFromPaise } from "@/lib/inrCurrency";
import {
  centerMerchandisePageCounts,
  filterMerchandiseShopCatalog,
} from "@/lib/merchandiseOrdersHelpers";
import {
  createCenterMerchandiseOrder,
  listActiveMerchandiseCatalog,
  listCenterMerchandiseOrders,
  validateMerchandisePromoCode,
  type MerchandisePaymentMethod,
  type MerchandiseShippingMode,
} from "@/lib/merchandiseOrdersApi";
import { listCenterMerchandisePaymentAlerts } from "@/lib/merchandiseRemindersApi";
import { fetchMerchandiseBrandSettings } from "@/lib/merchandiseSettingsApi";
import {
  isShippingAddressComplete,
  resolveFranchiseAddress,
  resolveStudentAddress,
  snapshotCustomAddress,
  type ShippingAddressSnapshot,
} from "@/lib/merchandiseShipping";
import { getSupabase } from "@/lib/supabase";
import { supabaseList } from "@/lib/supabaseResult";
import {
  confirmMerchandiseRazorpayPayment,
  startMerchandiseRazorpayCheckout,
} from "@/services/payments/merchandiseCheckout";
import { openRazorpayCheckout } from "@/services/payments/razorpayGateway";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { CenterMerchandiseAllocationsCard } from "./CenterMerchandiseAllocationsCard";
import { CenterMerchandiseOrderHistory } from "./CenterMerchandiseOrderHistory";
import { CenterStudentProfileAddressCard } from "./CenterStudentProfileAddressCard";
import { MerchandiseCheckoutPanel } from "./MerchandiseCheckoutPanel";
import { MerchandiseProductGrid } from "./MerchandiseProductGrid";
import { useCommerceBreakpoint } from "./hooks/useCommerceBreakpoint";
import "@/features/brand/franchiseApplications/franchiseApplications.css";
import {
  cartSubtotalCents,
  cartTotalQuantity,
  shopLinesFromCart,
  type MerchandiseShopLine,
} from "./merchandiseShopTypes";
import "./merchandiseShop.css";

type MerchTab = "shop" | "orders";

const emptyCustomAddress = {
  name: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
};

const ICON_SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const PLACE_ORDER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>
);

function toAddressPreviewParts(address: ShippingAddressSnapshot | null) {
  if (!address) return null;
  return {
    name: address.name,
    phone: address.phone,
    addressLine1: address.address_line1,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  };
}

function tabFromSearchParams(searchParams: URLSearchParams): MerchTab {
  const tab = searchParams.get("tab");
  if (tab === "orders") return tab;
  return "shop";
}

export function CenterMerchandiseOrdersPage() {
  const tenant = useTenant();
  const brandId = tenant.brandId;
  const centerId = tenant.centerId;
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDesktop, isMobile } = useCommerceBreakpoint();

  const tab = tabFromSearchParams(searchParams);
  const [stat, setStat] = useState<"catalog" | "unpaid" | "orders" | "total">(
    tab === "orders" ? "orders" : "catalog",
  );
  const setTab = (next: MerchTab, nextStat?: "catalog" | "unpaid" | "orders" | "total") => {
    setStat(nextStat ?? (next === "orders" ? "orders" : "catalog"));
    if (next === "shop") setSearchParams({});
    else setSearchParams({ tab: next });
  };

  useEffect(() => {
    if (searchParams.get("tab") === "allocation") {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [cart, setCart] = useState<Record<string, MerchandiseShopLine>>({});
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutExpanded, setCheckoutExpanded] = useState(false);
  const [shippingStudentId, setShippingStudentId] = useState("");
  const [shippingMode, setShippingMode] = useState<MerchandiseShippingMode>("franchise");
  const [customAddress, setCustomAddress] = useState(emptyCustomAddress);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoValid, setPromoValid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<MerchandisePaymentMethod>("invoice");
  const [search, setSearch] = useState("");

  const catalog = useQuery({
    queryKey: ["merchandise-catalog-active", brandId, centerId],
    enabled: !!brandId && !!centerId,
    queryFn: () => listActiveMerchandiseCatalog(brandId!, centerId!),
  });

  const brandSettings = useQuery({
    queryKey: ["merchandise-brand-settings", brandId],
    enabled: !!brandId,
    queryFn: () => fetchMerchandiseBrandSettings(brandId!),
  });

  const merchandiseOrders = useQuery({
    queryKey: ["center-merchandise-orders", centerId],
    enabled: !!centerId,
    queryFn: () => listCenterMerchandiseOrders(centerId!),
  });

  const paymentOptions = useMemo(() => {
    const mode = brandSettings.data?.payment_mode ?? "both";
    if (mode === "razorpay") return [{ value: "razorpay" as const, label: "Pay now (Razorpay)" }];
    if (mode === "invoice") return [{ value: "invoice" as const, label: "Invoice / bank transfer" }];
    return [
      { value: "razorpay" as const, label: "Pay now (Razorpay)" },
      { value: "invoice" as const, label: "Invoice / bank transfer" },
    ];
  }, [brandSettings.data?.payment_mode]);

  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((o) => o.value === paymentMethod)) {
      setPaymentMethod(paymentOptions[0]!.value);
    }
  }, [paymentOptions, paymentMethod]);

  const students = useQuery({
    queryKey: ["center-students-for-merchandise-orders", brandId, centerId],
    enabled: !!brandId && !!centerId,
    queryFn: async () => {
      const { data: enrollments, error: eErr } = await getSupabase()
        .from("student_enrollments")
        .select("student_id, students(id, full_name)")
        .eq("center_id", centerId!)
        .eq("status", "active");
      if (eErr) throw eErr;
      const rows = supabaseList(enrollments, null) as {
        student_id: string;
        students: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
      }[];
      return rows.map((r) => {
        const student = Array.isArray(r.students) ? r.students[0] : r.students;
        return { id: student?.id ?? r.student_id, full_name: student?.full_name ?? "Student" };
      });
    },
  });

  const cartStudentIds = useMemo(() => {
    const ids = new Set<string>();
    shopLinesFromCart(cart).forEach((line) => {
      if (line.studentId) ids.add(line.studentId);
    });
    return [...ids];
  }, [cart]);

  const shippingStudentTarget = useMemo(() => {
    if (shippingMode !== "student") return "";
    if (cartStudentIds.length === 1) return cartStudentIds[0]!;
    return shippingStudentId;
  }, [shippingMode, cartStudentIds, shippingStudentId]);

  const resolvedAddress = useQuery({
    queryKey: ["merchandise-shipping-preview", shippingMode, centerId, brandId, shippingStudentTarget],
    enabled: !!centerId && shippingMode !== "custom" && (shippingMode !== "student" || !!shippingStudentTarget),
    queryFn: async () => {
      if (shippingMode === "franchise") return resolveFranchiseAddress(centerId!);
      if (shippingMode === "student" && brandId && shippingStudentTarget) {
        return resolveStudentAddress(brandId, shippingStudentTarget);
      }
      return null;
    },
  });

  const shippingSnapshot = useMemo((): ShippingAddressSnapshot | null => {
    if (shippingMode === "custom") {
      return snapshotCustomAddress(customAddress);
    }
    return resolvedAddress.data ?? null;
  }, [shippingMode, customAddress, resolvedAddress.data]);

  const shippingComplete = isShippingAddressComplete(shippingMode, shippingSnapshot);
  const cartQty = cartTotalQuantity(cart);
  const cartSubtotal = cartSubtotalCents(cart, catalog.data ?? []);

  const paymentAlerts = useQuery({
    queryKey: ["center-merchandise-payment-alerts", centerId],
    enabled: !!centerId,
    queryFn: () => listCenterMerchandisePaymentAlerts(centerId!),
  });

  const validatePromo = useMutation({
    mutationFn: async () => {
      if (!brandId || !promoCode.trim()) throw new Error("Enter a promo code");
      clear();
      const result = await validateMerchandisePromoCode(brandId, promoCode, Math.max(cartQty, 1));
      if (!result.valid) {
        setPromoValid(false);
        setPromoMessage(result.message ?? "Invalid promo code");
        throw new Error(result.message ?? "Invalid promo code");
      }
      setPromoValid(true);
      setPromoMessage(result.message ?? "Promo code applied");
      return result;
    },
    onError: capture,
  });

  const payWithRazorpay = async (orderId: string, amountCents: number) => {
    const { data, error: checkoutErr } = await startMerchandiseRazorpayCheckout(orderId);
    if (checkoutErr) throw new Error(checkoutErr);
    if (data?.status === "stub") {
      throw new Error(String(data.message ?? "Razorpay is not configured."));
    }
    const keyId = String(data?.razorpay_key_id ?? brandSettings.data?.razorpay_key_id ?? "");
    const razorpayOrderId = String(data?.razorpay_order_id ?? "");
    if (!keyId || !razorpayOrderId) throw new Error("Unable to start Razorpay checkout");

    await openRazorpayCheckout({
      keyId,
      orderId,
      razorpayOrderId,
      amountCents,
      currency: "INR",
      name: tenant.brandSlug ?? "Merchandise",
      description: `Order ${orderId.slice(0, 8)}`,
      onSuccess: async (paymentId) => {
        await confirmMerchandiseRazorpayPayment(orderId, paymentId, razorpayOrderId, amountCents);
        void qc.invalidateQueries({ queryKey: ["center-merchandise-orders", centerId] });
        void qc.invalidateQueries({ queryKey: ["center-merchandise-payment-alerts", centerId] });
      },
    });
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      const lines = shopLinesFromCart(cart);
      if (!brandId || !centerId || lines.length === 0) throw new Error("Add at least one item to your order");
      if (shippingMode === "student" && !shippingStudentTarget) {
        throw new Error("Select a student for shipping or assign items to one student");
      }
      if (!shippingComplete) {
        throw new Error("Shipping address is incomplete. Update the address or choose a different shipping mode.");
      }
      clear();

      const orderLines = lines.map((line) => {
        const item = catalog.data?.find((c) => c.id === line.catalogItemId);
        if (!item) throw new Error("Catalog item not found");
        return {
          catalogItemId: item.id,
          quantity: line.quantity,
          unitPriceCents: item.price_cents,
          studentId: line.studentId || undefined,
        };
      });

      const orderId = await createCenterMerchandiseOrder(brandId, centerId, {
        lines: orderLines,
        shippingMode,
        shippingAddress: shippingSnapshot as Record<string, unknown>,
        promoCode: promoValid ? promoCode : undefined,
        paymentMethod,
      });

      if (paymentMethod === "razorpay") {
        const { data: orderRow, error: orderErr } = await getSupabase()
          .from("merchandise_orders")
          .select("total_cents")
          .eq("id", orderId)
          .single();
        if (orderErr) throw orderErr;
        await payWithRazorpay(orderId, orderRow.total_cents);
      }
      return orderId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["center-merchandise-orders", centerId] });
      void qc.invalidateQueries({ queryKey: ["center-merchandise-payment-alerts", centerId] });
      void qc.invalidateQueries({ queryKey: ["center-inventory-summary", brandId, centerId] });
      setCart({});
      setPromoCode("");
      setPromoMessage(null);
      setPromoValid(false);
      setCheckoutExpanded(false);
      setMobileCartOpen(false);
      setTab("orders");
    },
    onError: capture,
  });

  const updateCartLine = (catalogItemId: string, patch: Partial<MerchandiseShopLine>) => {
    setCart((prev) => {
      const existing = prev[catalogItemId] ?? { catalogItemId, quantity: 0, studentId: "" };
      const next = { ...existing, ...patch };
      if (next.quantity <= 0) {
        const { [catalogItemId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [catalogItemId]: next };
    });
    setPromoValid(false);
    setPromoMessage(null);
  };

  const removeCartLine = (catalogItemId: string) => {
    updateCartLine(catalogItemId, { quantity: 0, studentId: "" });
    setCheckoutExpanded(false);
  };

  const handleCheckoutAction = () => {
    if (!checkoutExpanded) {
      setCheckoutExpanded(true);
      return;
    }
    placeOrder.mutate();
  };

  if (!centerId || !brandId) return <p className="ed-empty">Center context not found.</p>;

  const alerts = paymentAlerts.data;
  const catalogItems = catalog.data ?? [];
  const studentOptions = students.data ?? [];
  const needsShippingStudentPick = shippingMode === "student" && cartStudentIds.length !== 1;

  const visibleCatalog = filterMerchandiseShopCatalog(catalogItems, search);
  const pageCounts = centerMerchandisePageCounts(catalogItems.length, merchandiseOrders.data ?? []);

  const customAddressFields = (
    <FormGrid>
      <Input
        label="Recipient name"
        value={customAddress.name}
        onChange={(v) => setCustomAddress((a) => ({ ...a, name: v }))}
      />
      <Input
        label="Phone"
        type="tel"
        value={customAddress.phone}
        onChange={(v) => setCustomAddress((a) => ({ ...a, phone: v }))}
      />
      <Input
        label="Address line 1"
        value={customAddress.addressLine1}
        onChange={(v) => setCustomAddress((a) => ({ ...a, addressLine1: v }))}
      />
      <Input
        label="City"
        value={customAddress.city}
        onChange={(v) => setCustomAddress((a) => ({ ...a, city: v }))}
      />
      <Input
        label="State"
        value={customAddress.state}
        onChange={(v) => setCustomAddress((a) => ({ ...a, state: v }))}
      />
      <Input
        label="Pincode"
        value={customAddress.pincode}
        onChange={(v) => setCustomAddress((a) => ({ ...a, pincode: v }))}
      />
    </FormGrid>
  );

  const shippingStudentFields = needsShippingStudentPick ? (
    <Select
      label="Ship to student"
      value={shippingStudentId}
      onChange={setShippingStudentId}
      placeholder="Select student"
      options={studentOptions.map((s) => ({ value: s.id, label: s.full_name }))}
    />
  ) : null;

  const checkoutPanelProps = {
    cart,
    catalog: catalogItems,
    shippingMode,
    onShippingModeChange: setShippingMode,
    shippingPreview: (
      <ShippingAddressPreview
        prefix="Shipping preview: "
        address={toAddressPreviewParts(resolvedAddress.data ?? null)}
      />
    ),
    shippingComplete,
    customAddressFields,
    shippingStudentFields,
    promoCode,
    onPromoCodeChange: (v: string) => {
      setPromoCode(v);
      setPromoValid(false);
      setPromoMessage(null);
    },
    promoMessage,
    promoValid,
    onValidatePromo: () => validatePromo.mutate(),
    promoValidating: validatePromo.isPending,
    paymentMethod,
    onPaymentMethodChange: setPaymentMethod,
    paymentOptions,
    onPlaceOrder: handleCheckoutAction,
    onRemoveLine: removeCartLine,
    placing: placeOrder.isPending,
    error,
    checkoutExpanded,
  };

  const ordersSidebar = (
    <div className="ed-center-merch-aside">
      <CenterMerchandiseAllocationsCard brandId={brandId} centerId={centerId} layout="widget" />
      <CenterStudentProfileAddressCard brandId={brandId} centerId={centerId} layout="widget" />
    </div>
  );

  const shopList = (
    <div className="ed-pipeline-list-panel">
      <section aria-label="Product catalog">
        <MerchandiseProductGrid
          catalog={visibleCatalog}
          cart={cart}
          students={studentOptions}
          onUpdateLine={updateCartLine}
        />
      </section>
    </div>
  );

  const shopDetail = (
    <div className="ed-merch-checkout">
      <MerchandiseCheckoutPanel {...checkoutPanelProps} />
    </div>
  );

  const ordersList = (
    <div className="ed-pipeline-list-panel">
      <CenterMerchandiseOrderHistory
        centerId={centerId}
        brandId={brandId}
        brandSlug={tenant.brandSlug}
        search={search}
      />
    </div>
  );

  return (
    <div className="ed-franchise-apps-page ed-center-merch-page">
      <PipelinePageHeader
        title="Merchandise"
        subtitle="Track and manage kit orders for your center."
        actions={
          <Button onClick={() => setTab("shop")}>
            {PLACE_ORDER_ICON}
            Place New Order
          </Button>
        }
      />
      <MutationError message={error} />

      <LeadKpiGrid>
        <LeadKpiCard
          label="Catalog"
          value={pageCounts.catalog}
          hint="Live SKUs"
          active={stat === "catalog"}
          onClick={() => setTab("shop", "catalog")}
        />
        <LeadKpiCard
          label="Unpaid"
          value={pageCounts.unpaid}
          hint="Needs payment"
          tone="lost"
          active={stat === "unpaid"}
          onClick={() => setTab("orders", "unpaid")}
        />
        <LeadKpiCard
          label="Orders"
          value={pageCounts.orders}
          hint="Center orders"
          active={stat === "orders"}
          onClick={() => setTab("orders", "orders")}
        />
        <LeadKpiCard
          label={isMobile ? "All items" : "Total"}
          value={pageCounts.total}
          hint="Catalog SKUs"
          tone="total"
          active={stat === "total"}
          onClick={() => setTab("shop", "total")}
        />
      </LeadKpiGrid>

      {alerts && alerts.unpaid_count > 0 ? (
        <CommerceAlertBanner
          message={
            <>
              {alerts.unpaid_count} order{alerts.unpaid_count === 1 ? "" : "s"} awaiting payment (
              {formatInrFromPaise(alerts.unpaid_total_cents)} total).
              {alerts.overdue_count > 0
                ? ` ${alerts.overdue_count} invoice${alerts.overdue_count === 1 ? " is" : "s are"} overdue.`
                : null}
            </>
          }
          actionLabel="Pay Now"
          onAction={() => setTab("orders")}
        />
      ) : null}

      <div className="ed-franchise-apps-page__toolbar">
        <label className="ed-franchise-apps-page__search">
          <span className="ed-franchise-apps-page__search-icon">{ICON_SEARCH}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tab === "orders" ? "Search orders..." : "Search catalog, curriculum, or SKU..."}
            aria-label={tab === "orders" ? "Search orders" : "Search catalog"}
          />
        </label>
        <FilterTabs
          options={[
            { value: "shop", label: "Shop", count: pageCounts.catalog },
            { value: "orders", label: "My Orders", count: pageCounts.orders },
          ]}
          value={tab}
          onChange={setTab}
          aria-label="Merchandise sections"
        />
      </div>

      {tab === "shop" ? (
        isDesktop ? (
          <PipelineWorkspace detailOpen list={shopList} detail={shopDetail} />
        ) : (
          <div className="ed-merch-shop">{shopList}</div>
        )
      ) : isDesktop ? (
        <PipelineWorkspace detailOpen list={ordersList} detail={ordersSidebar} />
      ) : (
        <>
          {ordersList}
          {ordersSidebar}
        </>
      )}

      {isMobile && tab === "shop" && cartQty > 0 ? (
        <MobileCartBar
          itemCount={cartQty}
          totalLabel={formatInrFromPaise(cartSubtotal)}
          onOpen={() => setMobileCartOpen(true)}
        />
      ) : null}

      {isMobile && mobileCartOpen ? (
        <div className="ed-commerce-drawer" role="dialog" aria-modal aria-label="Your order">
          <button
            type="button"
            className="ed-commerce-drawer__backdrop"
            aria-label="Close cart"
            onClick={() => setMobileCartOpen(false)}
          />
          <div className="ed-commerce-drawer__panel">
            <MerchandiseCheckoutPanel {...checkoutPanelProps} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
