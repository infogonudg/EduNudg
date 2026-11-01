import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandMerchandiseInventorySection } from "./BrandMerchandiseInventorySection";
import { DELETE_CONFIRM_PHRASE } from "@/features/shared/confirmDelete";
import { exactAccessibleName } from "@/test/exactAccessibleName";

const grantCenterMerchandiseStock = vi.fn().mockResolvedValue("grant-new");
const updateMerchandiseStockGrant = vi.fn().mockResolvedValue(undefined);
const deleteMerchandiseStockGrant = vi.fn().mockResolvedValue(undefined);
const listBrandMerchandiseStockGrants = vi.fn();
const fetchBrandCenters = vi.fn();
const listMerchandiseCatalog = vi.fn();

vi.mock("@/features/center/hooks/useOpsBreakpoint", () => ({
  useOpsBreakpoint: () => ({ isDesktop: true, isMobile: false }),
}));

vi.mock("@/lib/merchandiseStockGrantsApi", () => ({
  listBrandMerchandiseStockGrants: (...args: unknown[]) => listBrandMerchandiseStockGrants(...args),
  grantCenterMerchandiseStock: (...args: unknown[]) => grantCenterMerchandiseStock(...args),
  updateMerchandiseStockGrant: (...args: unknown[]) => updateMerchandiseStockGrant(...args),
  deleteMerchandiseStockGrant: (...args: unknown[]) => deleteMerchandiseStockGrant(...args),
  filterMerchandiseStockGrants: (rows: unknown[], search: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return (rows as { center_label: string; catalog_sku: string; catalog_name: string; note: string | null }[]).filter(
      (row) =>
        [row.center_label, row.catalog_sku, row.catalog_name, row.note ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
    );
  },
  formatStockGrantWhen: () => "Mar 1, 2026",
}));

vi.mock("@/lib/centerCentersApi", () => ({
  fetchBrandCenters: (...args: unknown[]) => fetchBrandCenters(...args),
}));

vi.mock("@/lib/merchandiseOrdersApi", () => ({
  listMerchandiseCatalog: (...args: unknown[]) => listMerchandiseCatalog(...args),
}));

function renderSection(formOpen = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrandMerchandiseInventorySection
        brandId="brand-1"
        formOpen={formOpen}
        onFormOpenChange={vi.fn()}
        search=""
      />
    </QueryClientProvider>
  );
}

describe("BrandMerchandiseInventorySection", () => {
  beforeEach(() => {
    grantCenterMerchandiseStock.mockClear();
    updateMerchandiseStockGrant.mockClear();
    deleteMerchandiseStockGrant.mockClear();
    listBrandMerchandiseStockGrants.mockResolvedValue([
      {
        id: "grant-1",
        brand_id: "brand-1",
        center_id: "center-1",
        catalog_item_id: "item-1",
        quantity: 5,
        note: "Seed",
        created_at: "2026-03-01T00:00:00Z",
        center_label: "Pune Central",
        catalog_sku: "BOOK-1",
        catalog_name: "Level 1 Book",
      },
    ]);
    fetchBrandCenters.mockResolvedValue([
      {
        id: "center-1",
        slug: "pune",
        name: "Pune Central",
        display_name: "Pune Central",
        status: "active",
        city: "Pune",
        region: null,
        pincode: null,
        contact_phone: null,
        address_line1: null,
        short_description: null,
        country: null,
        photo_url: null,
        social_links: [],
      },
    ]);
    listMerchandiseCatalog.mockResolvedValue([
      {
        id: "item-1",
        sku: "BOOK-1",
        name: "Level 1 Book",
        price_cents: 50000,
        currency: "INR",
        is_active: true,
        photo_urls: [],
      },
    ]);
  });

  it("regression_brand_add_stock_form_calls_grant_rpc", async () => {
    renderSection(true);

    expect(await screen.findByRole("heading", { name: "Add stock" })).toBeDefined();

    await waitFor(() => {
      expect(fetchBrandCenters).toHaveBeenCalled();
      expect(listMerchandiseCatalog).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Opening stock" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => {
      expect(grantCenterMerchandiseStock).toHaveBeenCalledWith({
        brandId: "brand-1",
        centerId: "center-1",
        catalogItemId: "item-1",
        quantity: 12,
        note: "Opening stock",
      });
    });
  });

  it("regression_brand_stock_grants_list_shows_franchise_and_sku", async () => {
    renderSection(false);
    expect(await screen.findByText("Level 1 Book")).toBeDefined();
    expect(screen.getAllByText(/Pune Central/).length).toBeGreaterThan(0);
    expect(screen.getByText("BOOK-1")).toBeDefined();
  });

  it("regression_brand_stock_grant_edit_calls_update_rpc", async () => {
    renderSection(false);
    expect(await screen.findByRole("button", { name: "Edit Details" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Edit Details" }));

    await waitFor(() => {
      expect(fetchBrandCenters).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateMerchandiseStockGrant).toHaveBeenCalledWith({
        grantId: "grant-1",
        centerId: "center-1",
        catalogItemId: "item-1",
        quantity: 9,
        note: "Seed",
      });
    });
  });

  it("regression_brand_stock_grant_delete_calls_delete_rpc", async () => {
    renderSection(false);
    expect(await screen.findByRole("button", { name: /Delete stock grant for Level 1 Book/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Delete stock grant for Level 1 Book/i }));

    expect(await screen.findByRole("heading", { name: "Delete stock grant?" })).toBeDefined();
    fireEvent.change(screen.getByLabelText(new RegExp(`Type ${DELETE_CONFIRM_PHRASE}`, "i")), {
      target: { value: DELETE_CONFIRM_PHRASE },
    });
    fireEvent.click(screen.getByRole("button", { name: exactAccessibleName("Delete") }));

    await waitFor(() => {
      expect(deleteMerchandiseStockGrant).toHaveBeenCalledWith("grant-1");
    });
  });
});
