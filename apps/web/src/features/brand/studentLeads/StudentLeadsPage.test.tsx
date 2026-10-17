import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudentLeadsPage } from "./StudentLeadsPage";

const sampleLead = {
  id: "lead-1",
  brand_id: "brand-1",
  center_id: null,
  full_name: "Parent Name",
  parent_name: "Arti Rathi",
  email: "arti@gmail.com",
  whatsapp_e164: "+98989898",
  child_name: "Yug Rathi",
  child_dob: "2014-04-14",
  pincode: "411018",
  city: "Pune",
  school_name: null,
  status: "new",
  lead_source: "brand",
  lost_reason: null,
  assigned_at: null,
  stale_at: null,
  last_center_action_at: null,
  created_at: "2026-06-15T18:09:36Z",
};

const { mockLeads } = vi.hoisted(() => ({
  mockLeads: [] as Record<string, unknown>[],
}));

vi.mock("@/features/brand/hooks/useBrandScope", () => ({
  useBrandScope: () => ({ brandId: "brand-1", brandSlug: "abacus", isLoading: false, missingBrand: false }),
}));

vi.mock("@/bootstrap/TenantProvider", () => ({
  useTenant: () => ({
    portalType: "brand",
    brandId: "brand-1",
    centerId: null,
    brandSlug: "abacus",
    hostname: "abacus.localhost",
  }),
}));

vi.mock("@/services/auth/accessAuditApi", () => ({
  reportAccessAudit: vi.fn(async () => undefined),
}));

vi.mock("@/features/center/hooks/useOpsBreakpoint", () => ({
  useOpsBreakpoint: () => ({ isDesktop: true, isMobile: false }),
}));

vi.mock("@/features/shared/manualLeads/ManualStudentLeadCard", () => ({
  ManualStudentLeadCard: () => <div>Manual student lead</div>,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: table === "leads" ? mockLeads : [],
              error: null,
            }),
          is: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        is: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: { exact: [], near: [] }, error: null }),
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <StudentLeadsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("StudentLeadsPage", () => {
  it("regression_student_leads_pipeline_layout", async () => {
    mockLeads.splice(0, mockLeads.length);
    const { container } = renderPage();

    expect(await screen.findByRole("heading", { name: "Student Leads" })).toBeDefined();
    expect(screen.getByText("Manage parent inquiries and track conversion pipeline.")).toBeDefined();
    expect(screen.getByRole("tablist", { name: "Lead filter" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Pending review (0)" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Decided (0)" })).toBeDefined();
    expect(screen.queryByRole("tab", { name: "Needs attention (0)" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Unassigned (0)" })).toBeNull();
    expect(screen.getByPlaceholderText("Search leads...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Export List" })).toBeDefined();
    expect(screen.getByRole("button", { name: "+ New Lead" })).toBeDefined();
    expect(container.querySelector(".ed-pipeline-workspace")).not.toBeNull();
    expect(screen.queryByText("Follow-up Insights")).toBeNull();
    expect(screen.queryByLabelText("Show")).toBeNull();

    const kpiLabels = [...container.querySelectorAll(".ed-lead-kpi__label")].map((el) => el.textContent);
    expect(kpiLabels).toEqual(["Pending review", "Converted", "Lost", "Total"]);
  });

  it("regression_student_leads_list_stays_visible_with_detail", async () => {
    mockLeads.splice(0, mockLeads.length, sampleLead);
    const { container } = renderPage();

    expect(await screen.findByRole("button", { name: /Arti Rathi/ })).toBeDefined();
    expect(container.querySelector(".ed-franchise-apps-page__desktop-list")).not.toBeNull();
    expect(container.querySelector(".ed-pipeline-workspace__detail")).not.toBeNull();
    expect(screen.queryByText("Follow-up Insights")).toBeNull();

    const cards = container.querySelectorAll(".ed-lead-kpi");
    fireEvent.click(cards[1]!);
    expect(screen.getByRole("tab", { name: "Decided (0)" }).getAttribute("aria-selected")).toBe("true");
    expect(cards[1]!.classList.contains("is-active")).toBe(true);
    expect(cards[2]!.classList.contains("is-active")).toBe(false);
  });

  it("regression_student_leads_kpi_click_highlights_the_clicked_card", async () => {
    mockLeads.splice(0, mockLeads.length, sampleLead);
    const { container } = renderPage();
    await screen.findByRole("button", { name: /Arti Rathi/ });
    const cards = container.querySelectorAll(".ed-lead-kpi");
    fireEvent.click(cards[1]!);
    expect(cards[1]!.classList.contains("is-active")).toBe(true);
    expect(cards[2]!.classList.contains("is-active")).toBe(false);
    fireEvent.click(cards[2]!);
    expect(cards[2]!.classList.contains("is-active")).toBe(true);
    expect(cards[1]!.classList.contains("is-active")).toBe(false);
  });

  it("regression_student_leads_detail_stacks_assignment_below_applicant", async () => {
    mockLeads.splice(0, mockLeads.length, sampleLead);
    const { container } = renderPage();

    const grid = (await screen.findByRole("heading", { name: "Assignment Management" })).closest(
      ".ed-student-leads__detail-grid",
    );
    expect(grid).not.toBeNull();
    const applicant = grid!.querySelector(".ed-lead-applicant-card");
    const assignment = grid!.querySelector(".ed-lead-assignment-panel");
    expect(applicant).not.toBeNull();
    expect(assignment).not.toBeNull();
    expect(applicant!.compareDocumentPosition(assignment!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const activity = grid!.querySelector(".ed-lead-activity-card");
    expect(activity).not.toBeNull();
    expect(assignment!.compareDocumentPosition(activity!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(grid!.lastElementChild).toBe(activity);
    expect(container.querySelector(".ed-pipeline-workspace__list")).not.toBeNull();
    expect(container.querySelectorAll(".ed-pipeline-workspace__detail .ed-student-leads__detail-grid").length).toBe(1);
  });
});
