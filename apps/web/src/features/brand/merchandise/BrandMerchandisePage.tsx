import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  FilterTabs,
  LeadKpiCard,
  LeadKpiGrid,
  PipelinePageHeader,
} from "@edunudg/ui";
import { useBrandScope } from "@/features/brand/hooks/useBrandScope";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import { listBrandMerchandiseOrders, listMerchandiseCatalog } from "@/lib/merchandiseOrdersApi";
import { BrandMerchandiseCatalogSection } from "./BrandMerchandiseCatalogSection";
import { BrandMerchandiseInventorySection } from "./BrandMerchandiseInventorySection";
import { BrandMerchandiseOrdersSection } from "./BrandMerchandiseOrdersSection";
import { BrandMerchandisePromoSection } from "./BrandMerchandisePromoSection";
import { BrandMerchandisePaymentSettings } from "./BrandMerchandisePaymentSettings";
import {
  merchandisePageCounts,
  merchandiseSearchAriaLabel,
  merchandiseSearchPlaceholder,
  type CatalogTabFilter,
  type MerchandiseSectionTab,
} from "./merchandisePageHelpers";
import "@/features/brand/franchiseApplications/franchiseApplications.css";
import "./brandMerchandiseCatalog.css";

const TABS = [
  { id: "catalog", label: "Catalog", mobileLabel: "Catalog" },
  { id: "promo", label: "Promo Codes", mobileLabel: "Promo Codes" },
  { id: "orders", label: "Orders", mobileLabel: "Orders" },
  { id: "inventory", label: "Inventory", mobileLabel: "Inventory" },
  { id: "payment", label: "Payment settings", mobileLabel: "Payment" },
] as const;

const ICON_SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export function BrandMerchandisePage() {
  const { brandId, missingBrand } = useBrandScope();
  const { isMobile } = useOpsBreakpoint();
  const [activeTab, setActiveTab] = useState<MerchandiseSectionTab>("catalog");
  const [catalogAddOpen, setCatalogAddOpen] = useState(false);
  const [promoAddOpen, setPromoAddOpen] = useState(false);
  const [stockAddOpen, setStockAddOpen] = useState(false);
  const [listFilter, setListFilter] = useState<CatalogTabFilter>("all");
  const [search, setSearch] = useState("");

  const catalog = useQuery({
    queryKey: ["merchandise-catalog", brandId],
    enabled: !!brandId,
    queryFn: () => listMerchandiseCatalog(brandId!),
  });

  const orders = useQuery({
    queryKey: ["brand-merchandise-orders", brandId],
    enabled: !!brandId,
    queryFn: () => listBrandMerchandiseOrders(brandId!),
  });

  const pageCounts = useMemo(
    () => merchandisePageCounts(catalog.data ?? [], orders.data?.length ?? 0),
    [catalog.data, orders.data],
  );

  if (missingBrand || !brandId) {
    return <p className="ed-empty">Brand context not found.</p>;
  }

  const openCatalogTab = (filter: CatalogTabFilter) => {
    setActiveTab("catalog");
    setListFilter(filter);
    setCatalogAddOpen(false);
    setPromoAddOpen(false);
    setStockAddOpen(false);
  };

  const selectTab = (value: MerchandiseSectionTab) => {
    if (value !== "catalog") setCatalogAddOpen(false);
    if (value !== "promo") setPromoAddOpen(false);
    if (value !== "inventory") setStockAddOpen(false);
    setActiveTab(value);
  };

  const tabOptions = TABS.map((tab) => ({
    value: tab.id,
    label: isMobile && tab.mobileLabel ? tab.mobileLabel : tab.label,
  }));

  const headerAction =
    activeTab === "catalog" ? (
      <Button onClick={() => setCatalogAddOpen(true)}>+ Add Merchandise</Button>
    ) : activeTab === "promo" ? (
      <Button onClick={() => setPromoAddOpen(true)}>+ Add Promo Code</Button>
    ) : activeTab === "inventory" ? (
      <Button onClick={() => setStockAddOpen(true)}>+ Add stock</Button>
    ) : null;

  return (
    <div className="ed-franchise-apps-page ed-brand-merch-page">
      <PipelinePageHeader
        title="Merchandise"
        subtitle="Manage catalog SKUs, promo codes, franchise orders, and stock grants."
        actions={headerAction}
      />

      <LeadKpiGrid>
        <LeadKpiCard
          label="Active"
          value={pageCounts.active}
          hint={pageCounts.active > 0 ? "Live SKUs" : undefined}
          active={activeTab === "catalog" && listFilter === "active"}
          onClick={() => openCatalogTab("active")}
        />
        <LeadKpiCard
          label="Draft"
          value={pageCounts.draft}
          hint="Not live"
          active={activeTab === "catalog" && listFilter === "draft"}
          onClick={() => openCatalogTab("draft")}
        />
        <LeadKpiCard
          label="Orders"
          value={pageCounts.orders}
          hint="Franchise orders"
          active={activeTab === "orders"}
          onClick={() => selectTab("orders")}
        />
        <LeadKpiCard
          label={isMobile ? "All items" : "Total"}
          value={pageCounts.total}
          hint="All SKUs"
          tone="total"
          active={activeTab === "catalog" && listFilter === "all"}
          onClick={() => openCatalogTab("all")}
        />
      </LeadKpiGrid>

      <div className="ed-franchise-apps-page__toolbar">
        <label className="ed-franchise-apps-page__search">
          <span className="ed-franchise-apps-page__search-icon">{ICON_SEARCH}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={merchandiseSearchPlaceholder(activeTab)}
            aria-label={merchandiseSearchAriaLabel(activeTab)}
          />
        </label>
        <FilterTabs
          options={tabOptions}
          value={activeTab}
          onChange={(value) => selectTab(value as MerchandiseSectionTab)}
          aria-label="Merchandise sections"
        />
      </div>

      {activeTab === "catalog" ? (
        <BrandMerchandiseCatalogSection
          brandId={brandId}
          formOpen={catalogAddOpen}
          onFormOpenChange={setCatalogAddOpen}
          listFilter={listFilter}
          search={search}
        />
      ) : null}
      {activeTab === "promo" ? (
        <BrandMerchandisePromoSection
          brandId={brandId}
          formOpen={promoAddOpen}
          onFormOpenChange={setPromoAddOpen}
          search={search}
        />
      ) : null}
      {activeTab === "orders" ? <BrandMerchandiseOrdersSection brandId={brandId} search={search} /> : null}
      {activeTab === "inventory" ? (
        <BrandMerchandiseInventorySection
          brandId={brandId}
          formOpen={stockAddOpen}
          onFormOpenChange={setStockAddOpen}
          search={search}
        />
      ) : null}
      {activeTab === "payment" ? <BrandMerchandisePaymentSettings brandId={brandId} search={search} /> : null}

      {isMobile && activeTab === "catalog" && !catalogAddOpen ? (
        <button
          type="button"
          className="ed-franchise-apps-page__fab"
          aria-label="Add Merchandise"
          onClick={() => setCatalogAddOpen(true)}
        >
          +
        </button>
      ) : null}

      {isMobile && activeTab === "promo" && !promoAddOpen ? (
        <button
          type="button"
          className="ed-franchise-apps-page__fab"
          aria-label="Add Promo Code"
          onClick={() => setPromoAddOpen(true)}
        >
          +
        </button>
      ) : null}

      {isMobile && activeTab === "inventory" && !stockAddOpen ? (
        <button
          type="button"
          className="ed-franchise-apps-page__fab"
          aria-label="Add stock"
          onClick={() => setStockAddOpen(true)}
        >
          +
        </button>
      ) : null}
    </div>
  );
}
