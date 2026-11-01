import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  studentPortalPasswordHint,
  upsertStudentPortalCredentials,
} from "@/lib/studentPortalCredentialsApi";

const invokeMock = vi.fn();
const reportAccessAudit = vi.fn(async () => undefined);

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  }),
}));

vi.mock("@/services/auth/accessAuditApi", () => ({
  reportAccessAudit: (...args: unknown[]) => reportAccessAudit(...args),
}));

describe("studentPortalCredentialsApi", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    reportAccessAudit.mockClear();
  });

  it("regression_student_portal_password_required_when_not_provisioned", async () => {
    const result = await upsertStudentPortalCredentials({
      studentId: "s1",
      centerId: "c1",
      brandId: "b1",
      email: "kid@example.com",
      password: "",
      alreadyProvisioned: false,
    });
    expect(result.error).toMatch(/Password required/i);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("regression_student_portal_password_rejects_short_admin", async () => {
    const result = await upsertStudentPortalCredentials({
      studentId: "s1",
      centerId: "c1",
      brandId: "b1",
      email: "kid@example.com",
      password: "admin",
      alreadyProvisioned: false,
    });
    expect(result.error).toMatch(/at least 6 characters/i);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("regression_student_portal_credentials_invoke_edge_function", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, loginEmail: "kid@example.com", passwordWasSet: true },
      error: null,
    });
    const result = await upsertStudentPortalCredentials({
      studentId: "s1",
      centerId: "c1",
      brandId: "b1",
      email: "kid@example.com",
      password: "secret1",
      fullName: "Kid",
      alreadyProvisioned: false,
    });
    expect(result.error).toBeNull();
    expect(result.passwordWasSet).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("student-portal-credentials", {
      body: {
        studentId: "s1",
        centerId: "c1",
        brandId: "b1",
        email: "kid@example.com",
        password: "secret1",
        fullName: "Kid",
      },
    });
  });

  it("studentPortalPasswordHint distinguishes new vs reset", () => {
    expect(studentPortalPasswordHint(false)).toMatch(/Required for a new/i);
    expect(studentPortalPasswordHint(true)).toMatch(/Leave blank/i);
  });
});
