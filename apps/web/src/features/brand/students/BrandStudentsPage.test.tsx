import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandStudentsPage } from "../BrandStudentsPage";
import type { BrandStudentRow } from "@/lib/brandStudentsApi";
import { exactAccessibleName } from "@/test/exactAccessibleName";

const { mockStudents, downloadTextFile } = vi.hoisted(() => {
  const downloadTextFile = vi.fn();
  const students: BrandStudentRow[] = [
    {
      id: "s1",
      enrollment_id: "e1",
      full_name: "Meera Sharma",
      student_code: "SBA-101",
      login_email: "meera@example.com",
      user_id: "u1",
      date_of_birth: "2014-05-12",
      photo_url: null,
      enrollment_status: "active",
      enrollment_created_at: "2026-01-10T00:00:00Z",
      program_id: "p1",
      program_name: "Abacus Core",
      starting_level_id: "l1",
      starting_level_name: "Level 1",
      current_level_id: "l2",
      current_level_name: "Level 2",
      levels: [
        {
          level_id: "l1",
          name: "Level 1",
          sort_order: 1,
          status: "completed",
          abacus_level_code: "L1",
          is_current: false,
        },
        {
          level_id: "l2",
          name: "Level 2",
          sort_order: 2,
          status: "in_progress",
          abacus_level_code: "L2",
          is_current: true,
        },
      ],
      center_id: "c1",
      center_slug: "koramangala",
      center_name: "Abacus Koramangala",
      center_city: "Bengaluru",
      phone: "+919876543210",
      address_line1: "12 Main St",
      city: "Bengaluru",
      state: "KA",
      pincode: "560034",
      school_name: "Oakridge",
      parent_name: "Anita Sharma",
      parent_email: "anita@example.com",
      parent_phone: "+919900011111",
      batch_names: ["Morning A"],
    },
    {
      id: "s2",
      enrollment_id: "e2",
      full_name: "Arjun Rao",
      student_code: "SBA-202",
      login_email: null,
      user_id: null,
      date_of_birth: null,
      photo_url: null,
      enrollment_status: "active",
      enrollment_created_at: "2026-02-01T00:00:00Z",
      program_id: null,
      program_name: null,
      starting_level_id: null,
      starting_level_name: null,
      current_level_id: null,
      current_level_name: null,
      levels: [],
      center_id: "c2",
      center_slug: "jayanagar",
      center_name: "Jayanagar",
      center_city: "Mysuru",
      phone: null,
      address_line1: null,
      city: null,
      state: null,
      pincode: null,
      school_name: null,
      parent_name: null,
      parent_email: null,
      parent_phone: null,
      batch_names: [],
    },
  ];
  return { mockStudents: students, downloadTextFile };
});

vi.mock("@/lib/platformDataExportHelpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platformDataExportHelpers")>();
  return {
    ...actual,
    downloadTextFile,
  };
});

vi.mock("@/features/brand/hooks/useBrandScope", () => ({
  useBrandScope: () => ({
    brandId: "brand-1",
    brandSlug: "smart-brain-abacus",
    isLoading: false,
    missingBrand: false,
  }),
}));

vi.mock("@/bootstrap/TenantProvider", () => ({
  useTenant: () => ({
    portalType: "brand",
    brandId: "brand-1",
    centerId: null,
    brandSlug: "smart-brain-abacus",
    hostname: "smart-brain-abacus.localhost",
  }),
}));

vi.mock("@/services/auth/accessAuditApi", () => ({
  reportAccessAudit: vi.fn(async () => undefined),
}));

vi.mock("@/features/center/hooks/useOpsBreakpoint", () => ({
  useOpsBreakpoint: () => ({ isDesktop: true, isMobile: false }),
}));

vi.mock("@/lib/brandStudentsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brandStudentsApi")>();
  return {
    ...actual,
    fetchBrandStudents: vi.fn().mockResolvedValue(mockStudents),
  };
});

function renderPage(initialEntries = ["/app/students"]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={qc}>
        <BrandStudentsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("BrandStudentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regression_brand_students_page_matches_centers_chrome", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Students" })).toBeDefined();
    expect(screen.getByText("Total Students")).toBeDefined();
    expect(screen.getByText("Directory")).toBeDefined();
    expect(screen.getByPlaceholderText("Search by student, franchise, or city…")).toBeDefined();
    expect(document.querySelector(".ed-brand-centers__layout")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDefined();
  });

  it("regression_brand_students_search_by_name_franchise_city", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Meera Sharma")).toBeDefined();
      expect(screen.getByText("Arjun Rao")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("Search by student, franchise, or city…"), {
      target: { value: "mysuru" },
    });
    await waitFor(() => {
      expect(screen.getByText("Arjun Rao")).toBeDefined();
      expect(screen.queryByText("Meera Sharma")).toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText("Search by student, franchise, or city…"), {
      target: { value: "koramangala" },
    });
    await waitFor(() => {
      expect(screen.getByText("Meera Sharma")).toBeDefined();
      expect(screen.queryByText("Arjun Rao")).toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText("Search by student, franchise, or city…"), {
      target: { value: "arjun" },
    });
    await waitFor(() => {
      expect(screen.getByText("Arjun Rao")).toBeDefined();
    });
  });

  it("regression_brand_student_directory_shows_unassigned_not_pending", async () => {
    renderPage();
    await screen.findByText("Arjun Rao");
    expect(screen.getAllByText("UNASSIGNED").length).toBeGreaterThan(0);
    expect(screen.queryByText("PENDING")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Arjun Rao/ }));
    expect(await screen.findAllByText("UNASSIGNED")).toHaveLength(2);
    expect(screen.queryByText("PENDING")).toBeNull();
  });

  it("regression_brand_student_card_shows_contact_and_levels", async () => {
    renderPage(["/app/students?student=s1"]);
    expect(await screen.findByText("Student ID: SBA-101")).toBeDefined();
    expect(screen.getByLabelText(exactAccessibleName("Login email"))).toBeDefined();
    expect((screen.getByLabelText(exactAccessibleName("Phone")) as HTMLInputElement).value).toContain("9876543210");
    expect((screen.getByLabelText("Parent name") as HTMLInputElement).value).toBe("Anita Sharma");
    expect(screen.getByRole("heading", { name: "Curriculum" })).toBeDefined();
    expect(screen.getByText("Level 2 (L2)")).toBeDefined();
    expect(screen.getByText("Current · In progress")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Copy Profile URL" })).toBeNull();
  });

  it("regression_brand_students_exports_full_roster_csv", async () => {
    renderPage();
    const exportBtn = await screen.findByRole("button", { name: "Export CSV" });
    fireEvent.change(screen.getByPlaceholderText("Search by student, franchise, or city…"), {
      target: { value: "mysuru" },
    });
    await waitFor(() => {
      expect(screen.getByText("Arjun Rao")).toBeDefined();
      expect(screen.queryByText("Meera Sharma")).toBeNull();
    });
    fireEvent.click(exportBtn);
    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [csv, filename, mime] = downloadTextFile.mock.calls[0]!;
    expect(filename).toMatch(/^smart-brain-abacus-students-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mime).toBe("text/csv;charset=utf-8");
    expect(csv).toContain("Meera Sharma");
    expect(csv).toContain("Arjun Rao");
    expect(csv).toContain("Abacus Koramangala");
  });
});
