import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CenterStudentDetailPanel } from "./CenterStudentDetailPanel";
import { upsertStudentDeliveryAddress } from "@/lib/studentProfileApi";

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => true,
  useBrandFeatureFlags: () => ({ batches: true }),
  FEATURE_FLAG_DEFAULTS: { batches: false },
  resolveFeatureFlags: () => true,
}));

vi.mock("@/lib/studentPortalAdminApi", () => ({
  pinEnrollmentProgram: vi.fn(),
}));

const upsertStudentPortalCredentials = vi.fn();

vi.mock("@/lib/studentPortalCredentialsApi", () => ({
  upsertStudentPortalCredentials: (...args: unknown[]) => upsertStudentPortalCredentials(...args),
  studentPortalPasswordHint: (already: boolean) =>
    already
      ? "Leave blank to keep the current password, or enter a new one (min 6 characters) to reset."
      : "Required for a new student login (min 6 characters). Share it with the student once.",
}));

vi.mock("@/lib/centerStudentProgramApi", () => ({
  fetchCenterStudentProgramContext: vi.fn().mockResolvedValue({
    enrollment_id: "e1",
    program_id: "p1",
    program_name: "Abacus Core",
    starting_level_id: "l1",
    starting_level_name: "Level 1",
    current_level_id: "l1",
    current_level_name: "Level 1",
    levels: [{ level_id: "l1", name: "Level 1", sort_order: 1, status: "in_progress", abacus_level_code: "L1" }],
  }),
}));

vi.mock("@/lib/centerBatchesApi", () => ({
  fetchAuthorizedPrograms: vi.fn().mockResolvedValue([{ id: "p1", name: "Abacus Core" }]),
  fetchCenterBatches: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/studentProfileApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studentProfileApi")>();
  return {
    ...actual,
    fetchStudentProfileAddress: vi.fn().mockResolvedValue({
      address_line1: "12 Main Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      phone: "+91 98765 43210",
    }),
    upsertStudentDeliveryAddress: vi.fn(),
  };
});

vi.mock("@/lib/centerStudentsApi", () => ({
  syncStudentBatchAssignments: vi.fn(),
}));

vi.mock("@/lib/curriculumApi", () => ({
  fetchLevels: vi.fn().mockResolvedValue([
    { id: "l1", name: "Level 1", sort_order: 1, abacus_level_code: "L1" },
  ]),
}));

vi.mock("@/lib/centerAssessmentsApi", () => ({
  listStudentAssessments: vi.fn().mockResolvedValue([]),
  recordStudentAssessment: vi.fn(),
}));

vi.mock("@/bootstrap/TenantProvider", () => ({
  useTenant: () => ({
    portalType: "center",
    brandId: "brand-1",
    centerId: "center-1",
    brandSlug: "smart-brain-abacus",
    centerSlug: "smart-brain-abacus",
  }),
}));

vi.mock("@/services/auth/accessAuditApi", () => ({
  reportAccessAudit: vi.fn(async () => undefined),
}));

const student = {
  id: "s1",
  full_name: "Asha Kumar",
  student_code: "STU-1",
  login_email: null,
  parent_email: "asha.parent@example.com",
  user_id: null,
  enrollment_id: "e1",
  enrollment_status: "active",
  enrollment_created_at: "2023-10-01T00:00:00.000Z",
  program_id: null,
  program_name: null,
  starting_level_id: null,
  starting_level_name: null,
  batch_ids: [],
  batch_names: [],
};

describe("CenterStudentDetailPanel", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    upsertStudentPortalCredentials.mockReset();
    upsertStudentPortalCredentials.mockResolvedValue({
      error: null,
      loginEmail: "asha.parent@example.com",
      passwordWasSet: true,
    });
  });

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(window, "location", {
      value: {
        protocol: "http:",
        hostname: "smart-brain-abacus.smart-brain-abacus.localhost",
        port: "9000",
        origin: "http://smart-brain-abacus.smart-brain-abacus.localhost:9000",
      },
      writable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CenterStudentDetailPanel student={student} brandId="brand-1" centerId="center-1" />
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("regression_shows_course_program_enrollment_section", () => {
    expect(screen.getByText("Course / program")).toBeDefined();
    expect(screen.getByRole("button", { name: "Update assignment" })).toBeDefined();
    expect(screen.getAllByText(/Starting level/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Active enrollment/i)).toBeDefined();
  });

  it("regression_assessments_tab_shows_record_form", async () => {
    fireEvent.click(screen.getByRole("tab", { name: /Assessments/i }));
    await waitFor(() => {
      expect(screen.getByText("Record assessment")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "Save assessment" })).toBeDefined();
  });

  it("regression_delivery_phone_is_dialable", async () => {
    await waitFor(() => {
      expect(screen.getByLabelText("Phone").getAttribute("value")).toBe("+91 98765 43210");
    });
    const dial = await screen.findByRole("link", { name: "Call +91 98765 43210" });
    expect(dial.getAttribute("href")).toBe("tel:+919876543210");
  });

  it("regression_delivery_phone_keeps_typed_value_without_remount", async () => {
    await waitFor(() => {
      expect(screen.getByLabelText("Phone").getAttribute("value")).toBe("+91 98765 43210");
    });
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "+91 98765 43210 / home" } });
    expect(screen.getByLabelText("Phone")).toBe(input);
    expect(input.value).toBe("+91 98765 43210 / home");
  });

  it("regression_portal_access_shows_provided_email", () => {
    expect(screen.getByLabelText("Login email").getAttribute("value")).toBe("asha.parent@example.com");
  });

  it("regression_center_student_activates_portal_login_with_password", async () => {
    expect(screen.getByRole("button", { name: "Activate portal login" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "Activate portal login" }));
    await waitFor(() => {
      expect(upsertStudentPortalCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "s1",
          email: "asha.parent@example.com",
          password: "secret1",
          alreadyProvisioned: false,
        })
      );
    });
    expect(await screen.findByText(/Password to share:/i)).toBeDefined();
    expect(screen.getByText("secret1")).toBeDefined();
  });

  it("regression_center_student_copies_learn_login_url_without_password", async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy Profile URL" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "http://learn.smart-brain-abacus.localhost:9000/login?center=smart-brain-abacus"
      );
    });
    expect(writeText.mock.calls[0]?.[0]).not.toMatch(/password/i);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeDefined();
  });

  it("regression_save_address_shows_saved_status", async () => {
    vi.mocked(upsertStudentDeliveryAddress).mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Save address" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saved" })).toBeDefined();
    });
    expect(screen.getByText("Address saved.")).toBeDefined();
    expect(document.querySelector(".ed-ops-save-status")?.textContent).toBe("Address saved.");
  });
});
