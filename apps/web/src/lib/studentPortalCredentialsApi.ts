import { getSupabase } from "@/lib/supabase";
import { parseFunctionsInvokeError } from "@/lib/parseFunctionsInvokeError";
import { staffAuthPasswordError } from "@/lib/staffAuthPassword";

export type UpsertStudentPortalCredentialsInput = {
  studentId: string;
  centerId: string;
  brandId: string;
  email: string;
  password?: string;
  fullName?: string;
  /** When false, a new Auth user requires a password. */
  alreadyProvisioned: boolean;
};

export type UpsertStudentPortalCredentialsResult = {
  error: string | null;
  loginEmail?: string;
  passwordWasSet?: boolean;
};

export function studentPortalPasswordHint(alreadyProvisioned: boolean): string {
  return alreadyProvisioned
    ? "Leave blank to keep the current password, or enter a new one (min 6 characters) to reset."
    : "Required for a new student login (min 6 characters). Share it with the student once.";
}

export async function upsertStudentPortalCredentials(
  input: UpsertStudentPortalCredentialsInput
): Promise<UpsertStudentPortalCredentialsResult> {
  const email = input.email.trim();
  if (!email) {
    return { error: "Login email is required" };
  }

  const password = input.password?.trim() ?? "";
  if (!input.alreadyProvisioned && !password) {
    return { error: "Password required for a new student portal login" };
  }

  const passwordError = staffAuthPasswordError(password || undefined);
  if (passwordError) return { error: passwordError };

  const { data, error } = await getSupabase().functions.invoke("student-portal-credentials", {
    body: {
      studentId: input.studentId,
      centerId: input.centerId,
      brandId: input.brandId,
      email,
      password: password || undefined,
      fullName: input.fullName?.trim() || undefined,
    },
  });

  if (error) return { error: await parseFunctionsInvokeError(error) };

  const payload = data as {
    error?: string;
    ok?: boolean;
    loginEmail?: string;
    passwordWasSet?: boolean;
  } | null;
  if (payload?.error) return { error: payload.error };
  if (!payload?.ok) return { error: "Failed to save student portal credentials" };

  const { reportAccessAudit } = await import("@/services/auth/accessAuditApi");
  void reportAccessAudit({
    action: "credentials",
    resourceType: "student_portal",
    resourceId: input.studentId,
    tenant: { portalType: "center", brandId: input.brandId, centerId: input.centerId },
    path: "/app/students",
    metadata: { email, passwordWasSet: Boolean(payload.passwordWasSet) },
  });

  return {
    error: null,
    loginEmail: payload.loginEmail ?? email,
    passwordWasSet: Boolean(payload.passwordWasSet),
  };
}
