import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandMerchandisePage } from "./BrandMerchandisePage";

vi.mock("@/features/brand/hooks/useBrandScope", () => ({
  useBrandScope: () => ({ brandId: "brand-1", missingBrand: false }),
}));

vi.mock("@/features/center/hooks/useOpsBreakpoint", () => ({
  useOpsBreakpoint: () => ({ isDesktop: true, isMobile: false }),
}));

vi.mock("./BrandMerchandiseCatalogSection", () => ({
  BrandMerchandiseCatalogSection: () => <div data-testid="catalog-section">Catalog section</div>,
}));

vi.mock("./BrandMerchandisePromoSection", () => ({
  BrandMerchandisePromoSection: () => <div data-testid="promo-section">Promo section</div>,
}));

vi.mock("./BrandMerchandiseOrdersSection", () => ({
  BrandMerchandiseOrdersSection: () => <div data-testid="orders-section">Orders section</div>,
}));

vi.mock("./BrandMerchandiseInventorySection", () => ({
  BrandMerchandiseInventorySection: () => <div data-testid="inventory-section">Inventory section</div>,
}));

vi.mock("./BrandMerchandisePaymentSettings", () => ({
  BrandMerchandisePaymentSettings: () => <div data-testid="payment-section">Payment section</div>,
}));

vi.mock("@/lib/merchandiseOrdersApi", () => ({
  listMerchandiseCatalog: vi.fn().mockResolvedValue([
    {
      id: "item-1",
      sku: "KIT001",
      name: "Level 1 Kit",
      price_cents: 105000,
      currency: "INR",
      is_active: true,
      photo_urls: ["https://cdn.example/photo-1.jpg"],
    },
    {
      id: "item-2",
      sku: "WB-DRAFT",
      name: "Workbook",
      price_cents: 50000,
      currency: "INR",
      is_active: false,
      photo_urls: [],
    },
  ]),
  listBrandMerchandiseOrders: vi.fn().mockResolvedValue([{ id: "order-1" }]),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BrandMerchandisePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BrandMerchandisePage", () => {
  it("regression_renders_merchandise_catalog_header_and_tabs", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Merchandise", level: 1 })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Store" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Catalog" })).toBeDefined();
    expect(screen.getByRole("button", { name: "+ Add Merchandise" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Promo Codes" })).toBeDefined();
    expect(await screen.findByTestId("catalog-section")).toBeDefined();
  });

  it("regression_merchandisePageOmitsCompetitionsTab", () => {
    renderPage();
    expect(screen.queryByRole("tab", { name: "Competitions" })).toBeNull();
  });

  it("regression_merchandise_page_matches_franchise_apps_stats_chrome", async () => {
    const { container } = renderPage();

    expect(screen.getByRole("heading", { name: "Merchandise" })).toBeDefined();
    expect(screen.getByText(/franchise orders, and stock grants/i)).toBeDefined();
    expect(screen.getByPlaceholderText("Search catalog...")).toBeDefined();
    expect(screen.getByRole("tablist", { name: "Merchandise sections" })).toBeDefined();
    expect(document.querySelector(".ed-pipeline-page-header")).toBeTruthy();
    expect(document.querySelector(".ed-lead-kpi-grid")).toBeTruthy();

    await waitFor(() => {
      const kpiValues = [...container.querySelectorAll(".ed-lead-kpi__value")].map((el) => el.textContent);
      expect(kpiValues).toEqual(["1", "1", "1", "2"]);
    });

    const kpiLabels = [...container.querySelectorAll(".ed-lead-kpi__label")].map((el) => el.textContent);
    expect(kpiLabels).toEqual(["Active", "Draft", "Orders", "Total"]);

    fireEvent.click(container.querySelectorAll(".ed-lead-kpi")[1]!);
    expect(container.querySelectorAll(".ed-lead-kpi")[1]!.classList.contains("is-active")).toBe(true);

    fireEvent.click(container.querySelectorAll(".ed-lead-kpi")[2]!);
    expect(await screen.findByTestId("orders-section")).toBeDefined();
    expect(screen.getByRole("tab", { name: /Orders/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("regression_merchandise_section_tabs_keep_catalog_workspace_chrome", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Promo Codes" }));
    expect(screen.getByTestId("promo-section")).toBeDefined();
    expect(screen.getByRole("button", { name: "+ Add Promo Code" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "+ Add Merchandise" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Search promo codes"), { target: { value: "SUMMER" } });
    expect(screen.getByRole("tab", { name: "Promo Codes" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByTestId("catalog-section")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(screen.getByTestId("orders-section")).toBeDefined();
    expect(screen.getByPlaceholderText("Search orders...")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Search orders"), { target: { value: "Pune" } });
    expect(screen.getByRole("tab", { name: "Orders" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByTestId("catalog-section")).toBeNull();
    expect(screen.queryByRole("button", { name: "+ Add Merchandise" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Inventory" }));
    expect(screen.getByTestId("inventory-section")).toBeDefined();
    expect(screen.getByRole("button", { name: "+ Add stock" })).toBeDefined();
    expect(screen.getByPlaceholderText("Search stock grants...")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Search stock grants"), { target: { value: "Pune" } });
    expect(screen.getByRole("tab", { name: "Inventory" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByTestId("catalog-section")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Payment settings" }));
    expect(screen.getByTestId("payment-section")).toBeDefined();
    expect(screen.getByPlaceholderText("Search payment settings...")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Search payment settings"), { target: { value: "Razorpay" } });
    expect(screen.getByRole("tab", { name: "Payment settings" }).getAttribute("aria-selected")).toBe("true");
  });

  it("regression_brand_merchandise_inventory_tab_adds_franchise_stock", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Inventory" }));
    expect(screen.getByTestId("inventory-section")).toBeDefined();
    expect(screen.getByRole("button", { name: "+ Add stock" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "+ Add Merchandise" })).toBeNull();
  });
});
