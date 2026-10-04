import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandDetailPage } from "./BrandDetailPage";

const fromMock = vi.fn();

const { updateBrandMarketingThemeMock, upsertBrandOwnerCredentialsMock, fetchBrandOwnerLoginEmailMock, patchBrandLandingSiteIdentityMock } =
  vi.hoisted(() => ({
    updateBrandMarketingThemeMock: vi.fn(),
    upsertBrandOwnerCredentialsMock: vi.fn(),
    fetchBrandOwnerLoginEmailMock: vi.fn(),
    patchBrandLandingSiteIdentityMock: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}));

vi.mock("@/lib/brandLandingEditorApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brandLandingEditorApi")>();
  return {
    ...actual,
    patchBrandLandingSiteIdentity: (...args: unknown[]) => patchBrandLandingSiteIdentityMock(...args),
  };
});

vi.mock("@/lib/brandLandingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brandLandingApi")>();
  return {
    ...actual,
    updateBrandMarketingTheme: (...args: unknown[]) => updateBrandMarketingThemeMock(...args),
  };
});

vi.mock("@/lib/brandOwnerCredentialsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brandOwnerCredentialsApi")>();
  return {
    ...actual,
    fetchBrandOwnerLoginEmail: (...args: unknown[]) => fetchBrandOwnerLoginEmailMock(...args),
    upsertBrandOwnerCredentials: (...args: unknown[]) => upsertBrandOwnerCredentialsMock(...args),
  };
});

vi.mock("./PortalOpenButton", () => ({
  PortalOpenButton: ({ label = "Open" }: { label?: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock("@/lib/brandSlug", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brandSlug")>();
  return {
    ...actual,
    uniqueBrandSlug: vi.fn().mockResolvedValue("demo"),
  };
});

function chain(result: { data: unknown; error: unknown; count?: number }) {
  const c = {
    select: vi.fn(() => c),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    eq: vi.fn(() => c),
    is: vi.fn(() => c),
    in: vi.fn(() => c),
    gte: vi.fn(() => c),
    order: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => c),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return c;
}

function countChain(count: number) {
  const c = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    is: vi.fn(() => c),
    in: vi.fn(() => Promise.resolve({ data: null, error: null, count })),
  };
  return c;
}

function renderDetail(slug = "demo") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[`/admin/brands/${slug}`]}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/admin/brands/:brandSlug" element={<BrandDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("BrandDetailPage", () => {
  beforeEach(() => {
    fromMock.mockReset();
    updateBrandMarketingThemeMock.mockReset();
    updateBrandMarketingThemeMock.mockResolvedValue(undefined);
    upsertBrandOwnerCredentialsMock.mockReset();
    upsertBrandOwnerCredentialsMock.mockResolvedValue({ error: null });
    fetchBrandOwnerLoginEmailMock.mockReset();
    fetchBrandOwnerLoginEmailMock.mockResolvedValue("owner@demo.com");
    patchBrandLandingSiteIdentityMock.mockReset();
    patchBrandLandingSiteIdentityMock.mockResolvedValue(undefined);
    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "demo",
            name: "Demo Brand",
            status: "active",
            logo_url: null,
            marketing_theme: "novu",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: [], error: null });
      }
      if (table === "domain_mappings") {
        return chain({
          data: [{ hostname: "demo.localhost", portal_type: "brand", is_primary: true }],
          error: null,
        });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      if (table === "brand_settings") {
        return chain({
          data: {
            id: "settings-1",
            settings: { features: { student_leads: true, merchandise: false } },
          },
          error: null,
        });
      }
      if (table === "students") {
        return countChain(12);
      }
      if (table === "student_enrollments") {
        let head = false;
        const c = {
          select: vi.fn((_cols: string, opts?: { head?: boolean }) => {
            head = !!opts?.head;
            return c;
          }),
          eq: vi.fn(() => {
            if (head) return Promise.resolve({ data: null, error: null, count: 5 });
            return c;
          }),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        };
        return c;
      }
      if (table === "royalty_settlements") {
        return chain({ data: [], error: null });
      }
      if (table === "platform_invoices") {
        return chain({ data: [], error: null });
      }
      if (table === "leads") {
        return countChain(3);
      }
      return chain({ data: [], error: null });
    });
  });

  it("renders brand view with monitoring and backend action", async () => {
    renderDetail("demo");
    expect(await screen.findByText("Performance (last 30 days)")).toBeDefined();
    expect(screen.getByRole("link", { name: "View Frontend ↗" }).getAttribute("href")).toMatch(
      /^http:\/\/demo\.localhost(?::\d+)?\/$/
    );
    expect(screen.getByRole("button", { name: "Open brand backend" })).toBeDefined();
    expect(screen.getByText("Brand settings")).toBeDefined();
    expect(screen.queryByText("Marketing theme")).toBeNull();
    expect(screen.getByLabelText("Website theme")).toBeDefined();
  });

  it("regression_uuid_brand_url_redirects_to_slug_path", async () => {
    renderDetail("a0000000-0000-4000-8000-000000000001");
    expect(await screen.findByText("Performance (last 30 days)")).toBeDefined();
  });

  it("regression_brand_detail_omits_duplicate_summary_kpis", async () => {
    renderDetail("demo");
    expect(await screen.findByText("Performance (last 30 days)")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Expand performance section" }));
    expect(await screen.findByText("Centers")).toBeDefined();
    expect(screen.queryByText("Centers listed")).toBeNull();
    expect(screen.queryByText("Brand portal")).toBeNull();
  });

  it("regression_brand_detail_omits_overview_metadata", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "abacusworld",
            name: "Abacus World",
            status: "active",
            logo_url: "https://example.com/logo.png",
            created_at: "2026-06-02T00:19:17.000Z",
            updated_at: "2026-06-05T09:06:45.000Z",
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: [], error: null });
      }
      if (table === "domain_mappings") {
        return chain({
          data: [{ hostname: "abacusworld.localhost", portal_type: "brand", is_primary: true }],
          error: null,
        });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      return countChain(0);
    });

    renderDetail("abacusworld");
    expect(await screen.findByText("Performance (last 30 days)")).toBeDefined();
    expect(screen.queryByText("Overview")).toBeNull();
    expect(screen.queryByText(/Created /)).toBeNull();
    expect(screen.queryByText(/Backend URL:/)).toBeNull();
    expect(document.querySelector(".ed-brand-detail__logo")?.getAttribute("src")).toBe("https://example.com/logo.png");
  });

  it("regression_brand_settings_form_on_detail_page", async () => {
    renderDetail("demo");
    expect(await screen.findByText("Brand settings")).toBeDefined();
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Status")).toBeDefined();
    expect(screen.getByLabelText("Login email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Website theme")).toBeDefined();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDefined();
    expect(screen.queryByLabelText("Slug")).toBeNull();
  });

  it("regression_brand_settings_saves_marketing_theme", async () => {
    renderDetail("demo");
    const themeSelect = await screen.findByLabelText("Website theme");
    await waitFor(() => expect(screen.getByDisplayValue("owner@demo.com")).toBeDefined());
    fireEvent.change(themeSelect, { target: { value: "abacus-classic" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateBrandMarketingThemeMock).toHaveBeenCalledWith("b1", "abacus-classic");
    });
    expect(upsertBrandOwnerCredentialsMock).not.toHaveBeenCalled();
  });

  it("regression_brand_settings_updates_credentials_only_when_login_fields_change", async () => {
    renderDetail("demo");
    await waitFor(() => expect(screen.getByDisplayValue("owner@demo.com")).toBeDefined());

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "new-secret-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(upsertBrandOwnerCredentialsMock).toHaveBeenCalledWith({
        brandId: "b1",
        email: "owner@demo.com",
        password: "new-secret-123",
        fullName: "Demo Brand",
      });
    });
  });

  it("regression_platform_brand_detail_includes_features_section", async () => {
    renderDetail("demo");
    expect(await screen.findByText("Features")).toBeDefined();
    expect(screen.getByText("Merchandise catalog & orders")).toBeDefined();
    expect(
      screen.getByText("Control which modules are active for this brand's portal and franchise centers.")
    ).toBeDefined();
  });

  it("regression_brand_detail_shows_franchise_center_csv_import", async () => {
    renderDetail("demo");
    expect(await screen.findByRole("button", { name: "Import Franchise" })).toBeDefined();
    expect(screen.getByText(/Import a CSV to onboard franchise locations/)).toBeDefined();
  });

  it("regression_domains_section_shows_open_for_all_portal_types", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "smart-brain-abacus",
            name: "Smart Brain Abacus",
            status: "active",
            logo_url: null,
            marketing_theme: "novu",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: [], error: null });
      }
      if (table === "domain_mappings") {
        return chain({
          data: [
            { hostname: "smart-brain-abacus.localhost", portal_type: "brand", is_primary: true },
            { hostname: "koramangala.smart-brain-abacus.localhost", portal_type: "center", is_primary: true },
            { hostname: "learn.smart-brain-abacus.localhost", portal_type: "learn", is_primary: false },
          ],
          error: null,
        });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      return countChain(0);
    });

    renderDetail("smart-brain-abacus");
    expect(await screen.findByRole("heading", { name: "Existing custom domains" })).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: /Local \/ seed hostnames/i }));
    expect(await screen.findByText(/learn\.smart-brain-abacus\.localhost/)).toBeDefined();
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(3);
    });
  });

  it("regression_brand_detail_prefers_landing_site_logo_over_brands_logo_url", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "demo",
            name: "Demo Brand",
            status: "active",
            logo_url: "https://cdn.example/brands-logo.png",
            marketing_theme: "novu",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: [], error: null });
      }
      if (table === "domain_mappings") {
        return chain({
          data: [{ hostname: "demo.localhost", portal_type: "brand", is_primary: true }],
          error: null,
        });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      if (table === "brand_settings") {
        return chain({
          data: {
            id: "settings-1",
            settings: {
              landing: { meta: { logoUrl: "https://cdn.example/homepage-logo.png" } },
            },
          },
          error: null,
        });
      }
      return countChain(0);
    });

    renderDetail("demo");
    expect(await screen.findByText("Brand settings")).toBeDefined();
    await waitFor(() => {
      expect(document.querySelector(".ed-brand-detail__logo")?.getAttribute("src")).toBe(
        "https://cdn.example/homepage-logo.png",
      );
    });
  });

  it("regression_platform_brand_name_save_writes_homepage_site_name", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "demo",
            name: "Demo Brand",
            status: "draft",
            logo_url: null,
            marketing_theme: "novu",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: [], error: null });
      }
      if (table === "domain_mappings") {
        return chain({
          data: [{ hostname: "demo.localhost", portal_type: "brand", is_primary: true }],
          error: null,
        });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      if (table === "brand_settings") {
        return chain({
          data: { id: "settings-1", settings: { features: { merchandise: false } } },
          error: null,
        });
      }
      return countChain(0);
    });

    renderDetail("demo");
    const nameInput = await screen.findByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Smart Brain Abacus" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(patchBrandLandingSiteIdentityMock).toHaveBeenCalledWith("b1", { siteName: "Smart Brain Abacus" });
    });
    expect(upsertBrandOwnerCredentialsMock).not.toHaveBeenCalled();
  });

  it("regression_brand_detail_paginates_centers_and_domains", async () => {
    const centers = Array.from({ length: 12 }, (_, index) => ({
      id: `c${index + 1}`,
      slug: `center-${index + 1}`,
      name: `Center ${index + 1}`,
      status: "active",
      city: "Bengaluru",
    }));
    const domains = Array.from({ length: 12 }, (_, index) => ({
      hostname: `host-${index + 1}.example.com`,
      portal_type: index === 0 ? "brand" : "center",
      is_primary: index === 0,
    }));

    fromMock.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({
          data: {
            id: "b1",
            slug: "smart-brain-abacus",
            name: "Smart Brain Abacus",
            status: "active",
            logo_url: null,
            marketing_theme: "novu",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "franchise_centers") {
        return chain({ data: centers, error: null });
      }
      if (table === "domain_mappings") {
        return chain({ data: domains, error: null });
      }
      if (table === "brand_subscriptions") {
        return chain({ data: null, error: null });
      }
      if (table === "brand_settings") {
        return chain({ data: { id: "settings-1", settings: {} }, error: null });
      }
      return countChain(0);
    });

    renderDetail("smart-brain-abacus");
    expect(await screen.findByText(/^Center 1$/)).toBeDefined();
    expect(screen.getByText("host-1.example.com")).toBeDefined();
    expect(screen.getByText("brand")).toBeDefined();
    expect(screen.getByText("primary")).toBeDefined();
    expect(screen.queryByText(/^Center 11$/)).toBeNull();
    expect(screen.queryByText("host-11.example.com")).toBeNull();

    const centersNav = screen.getByRole("navigation", { name: "Franchise centers pagination" });
    expect(within(centersNav).getByText("1–10 of 12")).toBeDefined();
    fireEvent.click(within(centersNav).getByRole("button", { name: "Next page" }));
    expect(await screen.findByText(/^Center 11$/)).toBeDefined();
    expect(screen.queryByText(/^Center 1$/)).toBeNull();

    const domainsNav = screen.getByRole("navigation", { name: "Domains pagination" });
    expect(within(domainsNav).getByText("1–10 of 12")).toBeDefined();
    fireEvent.click(within(domainsNav).getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("host-11.example.com")).toBeDefined();
    expect(screen.queryByText("host-1.example.com")).toBeNull();
  });
});
