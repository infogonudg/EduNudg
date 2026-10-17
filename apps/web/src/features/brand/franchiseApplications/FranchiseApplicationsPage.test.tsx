import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FranchiseApplicationsPage } from "./FranchiseApplicationsPage";
import { exactAccessibleName } from "@/test/exactAccessibleName";

const sampleInquiry = {
  id: "inq-1",
  full_name: "Priya Sharma",
  email: "priya@example.com",
  phone_e164: "+919876543210",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  address_line: "42 FC Road",
  proposed_franchise_name: "Abacus Pune West",
  prior_experience: "Ran a tutoring center for 3 years.",
  message: "Looking to open in Q3.",
  status: "new",
  rejected_reason: null,
  converted_center_id: null,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

const { mockInquiries, mockDeletedCenters } = vi.hoisted(() => ({
  mockInquiries: [] as Record<string, unknown>[],
  mockDeletedCenters: [] as { id: string; deleted_at: string | null }[],
}));

vi.mock("@/features/brand/hooks/useBrandScope", () => ({
  useBrandScope: () => ({ brandId: "brand-1", brandSlug: "abacus", isLoading: false, missingBrand: false }),
}));

vi.mock("@/features/shared/manualLeads/ManualFranchiseInquiryCard", () => ({
  ManualFranchiseInquiryCard: ({ open }: { open: boolean }) =>
    open ? <div>Manual franchise card</div> : null,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === "franchise_centers") {
        return {
          select: () => ({
            eq: () => ({
              not: () => Promise.resolve({ data: mockDeletedCenters, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockInquiries, error: null }),
          }),
        }),
      };
    },
  }),
}));

describe("FranchiseApplicationsPage", () => {
  beforeEach(() => {
    mockInquiries.splice(0, mockInquiries.length, sampleInquiry);
    mockDeletedCenters.splice(0, mockDeletedCenters.length);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("1024"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("regression_pipeline_list_with_filter_tabs", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );
    expect(await screen.findByText("Franchise Applications")).toBeDefined();
    expect(screen.getByText("Review and manage incoming center requests.")).toBeDefined();
    expect(screen.getByRole("tablist", { name: "Application filter" })).toBeDefined();
    expect(await screen.findByRole("tab", { name: /Pending review \(1\)/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Decided \(0\)/ })).toBeDefined();
    expect(screen.queryByRole("tab", { name: /All applications/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Deleted/ })).toBeNull();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Pending review (1)", "Decided (0)"]);
    expect(screen.getByPlaceholderText("Search applications...")).toBeDefined();
  });

  it("regression_franchise_apps_kpi_cards_match_lead_stats", async () => {
    mockInquiries.splice(0, mockInquiries.length, sampleInquiry, {
      ...sampleInquiry,
      id: "inq-approved",
      status: "converted",
      converted_center_id: "center-live",
      proposed_franchise_name: "Live Pune West",
    }, {
      ...sampleInquiry,
      id: "inq-rejected",
      status: "lost",
      proposed_franchise_name: "EduQuest Academy",
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByRole("tab", { name: /Pending review \(1\)/ })).toBeDefined();
    const kpiLabels = [...container.querySelectorAll(".ed-lead-kpi__label")].map((el) => el.textContent);
    expect(kpiLabels).toEqual(["Pending review", "Approved", "Rejected", "Total"]);
    const kpiValues = [...container.querySelectorAll(".ed-lead-kpi__value")].map((el) => el.textContent);
    expect(kpiValues).toEqual(["1", "1", "1", "3"]);

    const cards = container.querySelectorAll(".ed-lead-kpi");
    fireEvent.click(cards[1]!);
    expect(screen.getByRole("tab", { name: /Decided \(2\)/ }).getAttribute("aria-selected")).toBe("true");
    expect(cards[1]!.classList.contains("is-active")).toBe(true);
    expect(cards[2]!.classList.contains("is-active")).toBe(false);

    fireEvent.click(cards[2]!);
    expect(cards[2]!.classList.contains("is-active")).toBe(true);
    expect(cards[1]!.classList.contains("is-active")).toBe(false);
  });

  it("regression_franchise_apps_kpi_click_highlights_the_clicked_card", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );
    await screen.findByRole("tab", { name: /Pending review/ });
    const cards = container.querySelectorAll(".ed-lead-kpi");
    expect(cards[0]!.classList.contains("is-active")).toBe(true);
    fireEvent.click(cards[1]!);
    expect(cards[1]!.classList.contains("is-active")).toBe(true);
    expect(cards[2]!.classList.contains("is-active")).toBe(false);
    fireEvent.click(cards[3]!);
    expect(cards[3]!.classList.contains("is-active")).toBe(true);
    expect(cards[0]!.classList.contains("is-active")).toBe(false);
  });

  it("regression_franchise_name_opens_full_application_detail", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abacus Pune West/i }));

    expect(screen.getByText("Proposed Center Details")).toBeDefined();
    expect(screen.getByText("Applicant Information")).toBeDefined();
    expect(screen.getByText("42 FC Road")).toBeDefined();
    expect(screen.getByText("Ran a tutoring center for 3 years.")).toBeDefined();
    expect(screen.getByText("Looking to open in Q3.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Approve & create center" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDefined();
  });

  it("regression_add_franchise_opens_modal_instead_of_below_fold_form", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Franchise Applications")).toBeDefined();
    expect(screen.queryByText("Manual franchise card")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add Franchise" }));
    expect(screen.getByText("Manual franchise card")).toBeDefined();
  });

  it("regression_search_shows_matches_without_switching_tabs_first", async () => {
    mockInquiries.splice(0, mockInquiries.length, sampleInquiry, {
      ...sampleInquiry,
      id: "inq-decided",
      status: "lost",
      proposed_franchise_name: "EduQuest Academy",
      full_name: "Ravi Kumar",
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByRole("tab", { name: /Pending review \(1\)/ })).toBeDefined();
    expect(screen.queryByText("EduQuest Academy")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Search applications..."), {
      target: { value: "EduQuest" },
    });

    expect(await screen.findByRole("button", { name: /EduQuest Academy/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Pending review \(1\)/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.queryByRole("tab", { name: /All applications/ })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Search applications..."), {
      target: { value: "" },
    });

    expect(screen.queryByText("EduQuest Academy")).toBeNull();
    expect(screen.getByRole("tab", { name: /Pending review \(1\)/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("regression_franchise_apps_mobile_short_tabs_and_fab", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByRole("tab", { name: /Pending \(1\)/ })).toBeDefined();
    expect(screen.queryByRole("tab", { name: /Pending review/ })).toBeNull();
    expect(screen.getByRole("button", { name: exactAccessibleName("Add Franchise") })).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: /Abacus Pune West/i }));
    expect(screen.queryByRole("button", { name: exactAccessibleName("Add Franchise") })).toBeNull();
    expect(screen.getByRole("button", { name: "Approve & create center" })).toBeDefined();
  });

  it("regression_deleted_converted_inquiry_appears_on_decided_tab", async () => {
    mockInquiries.splice(0, mockInquiries.length, {
      ...sampleInquiry,
      id: "inq-deleted",
      status: "converted",
      converted_center_id: "center-gone",
      proposed_franchise_name: "Closed Pune West",
    });
    mockDeletedCenters.splice(0, mockDeletedCenters.length, {
      id: "center-gone",
      deleted_at: "2026-08-01T10:00:00Z",
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByRole("tab", { name: /Decided \(1\)/ })).toBeDefined();
    expect(screen.queryByRole("tab", { name: /Deleted/ })).toBeNull();
    expect(screen.queryByText("Closed Pune West")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Decided \(1\)/ }));
    const deletedRow = await screen.findByRole("button", { name: /Closed Pune West/i });
    expect(screen.getByText("DELETED")).toBeDefined();

    fireEvent.click(deletedRow);
    expect(screen.getByText(/deleted from Franchise Management/i)).toBeDefined();
  });

  it("regression_deleted_franchise_appears_last_on_decided", async () => {
    mockInquiries.splice(
      0,
      mockInquiries.length,
      {
        ...sampleInquiry,
        id: "inq-deleted",
        status: "converted",
        converted_center_id: "center-gone",
        proposed_franchise_name: "Closed Pune West",
        created_at: "2026-08-15T12:00:00Z",
      },
      {
        ...sampleInquiry,
        id: "inq-live",
        status: "converted",
        converted_center_id: "center-live",
        proposed_franchise_name: "Live Pune West",
        created_at: "2026-06-01T09:00:00Z",
      },
      sampleInquiry,
    );
    mockDeletedCenters.splice(0, mockDeletedCenters.length, {
      id: "center-gone",
      deleted_at: "2026-08-15T12:05:00Z",
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FranchiseApplicationsPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole("tab", { name: /Decided \(2\)/ }));
    const rows = await screen.findAllByRole("button", { name: /Pune West/i });
    expect(rows.map((row) => row.textContent?.includes("Closed Pune West"))).toEqual([false, true]);
  });
});
