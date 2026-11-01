import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  Input,
  MutationError,
  OpsSectionCard,
  PasswordInput,
  SaveButton,
  Select,
  ToggleField,
} from "@edunudg/ui";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import {
  fetchStudentProfileAddress,
  resolveStudentPortalLoginEmail,
  upsertStudentDeliveryAddress,
} from "@/lib/studentProfileApi";
import { pinEnrollmentProgram } from "@/lib/studentPortalAdminApi";
import {
  studentPortalPasswordHint,
  upsertStudentPortalCredentials,
} from "@/lib/studentPortalCredentialsApi";
import { fetchCenterStudentProgramContext } from "@/lib/centerStudentProgramApi";
import { syncStudentBatchAssignments, type CenterStudentRow } from "@/lib/centerStudentsApi";
import { fetchAuthorizedPrograms, fetchCenterBatches, type CenterBatchRow } from "@/lib/centerBatchesApi";
import { studentProfileLoginUrl } from "@/lib/centerStudentsHelpers";
import { fetchLevels } from "@/lib/curriculumApi";
import { initialsFromName } from "@/lib/welcomeMessage";
import { CenterStudentAssessmentPanel } from "@/features/center/assessments/CenterStudentAssessmentPanel";
import type { CenterStudentDetailTab } from "@/features/center/students/centerStudentDetailTabs";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useSavedFlash } from "@/features/shared/useSavedFlash";
import { useTenant } from "@/bootstrap/TenantProvider";
import { reportAccessAudit } from "@/services/auth/accessAuditApi";

type Props = {
  student: CenterStudentRow;
  brandId: string;
  centerId: string;
  onSaved?: () => void;
  initialTab?: CenterStudentDetailTab;
};

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(iso));
}

function formatBatchSchedule(batch: CenterBatchRow): string {
  const schedule = batch.schedule;
  if (schedule && typeof schedule === "object" && Array.isArray((schedule as { days?: unknown }).days)) {
    return ((schedule as { days: string[] }).days ?? []).join(", ");
  }
  return "Schedule on request";
}

const ICON_GRAD = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" />
  </svg>
);

const ICON_KEY = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const ICON_USERS = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ICON_CLIPBOARD = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);

export function CenterStudentDetailPanel({
  student,
  brandId,
  centerId,
  onSaved,
  initialTab = "enrollment",
}: Props) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const batchesEnabled = useFeatureFlag("batches");
  const [activeTab, setActiveTab] = useState<CenterStudentDetailTab>(initialTab);
  const [loginEmail, setLoginEmail] = useState(
    resolveStudentPortalLoginEmail(student.login_email, student.parent_email)
  );
  const [password, setPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [address, setAddress] = useState({
    address_line1: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });
  const [selectedBatches, setSelectedBatches] = useState<string[]>(student.batch_ids);
  const [programId, setProgramId] = useState(student.program_id ?? "");
  const [levelId, setLevelId] = useState(student.starting_level_id ?? "");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);
  const addressSaved = useSavedFlash();
  const portalSaved = useSavedFlash();

  const batches = useQuery({
    queryKey: ["center-batches", centerId],
    enabled: batchesEnabled,
    queryFn: () => fetchCenterBatches(centerId),
  });

  const programs = useQuery({
    queryKey: ["authorized-programs", centerId, brandId],
    queryFn: () => fetchAuthorizedPrograms(centerId, brandId),
  });

  const programLevels = useQuery({
    queryKey: ["student-assign-levels", programId],
    enabled: !!programId,
    queryFn: () => fetchLevels(programId),
  });

  const programContext = useQuery({
    queryKey: ["center-student-program", centerId, student.id],
    queryFn: () => fetchCenterStudentProgramContext(centerId, student.id),
  });

  const profile = useQuery({
    queryKey: ["student-profile-address", student.id],
    queryFn: () => fetchStudentProfileAddress(student.id),
  });

  useEffect(() => {
    setSelectedBatches(student.batch_ids);
    setLoginEmail(resolveStudentPortalLoginEmail(student.login_email, student.parent_email));
    setPassword("");
    setPasswordNotice(null);
    setProgramId(student.program_id ?? "");
    setLevelId(student.starting_level_id ?? "");
  }, [
    student.id,
    student.batch_ids,
    student.login_email,
    student.parent_email,
    student.program_id,
    student.starting_level_id,
  ]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [student.id, initialTab]);

  useEffect(() => {
    if (programId !== student.program_id) setLevelId("");
  }, [programId, student.program_id]);

  useEffect(() => {
    if (profile.data) {
      setAddress({
        address_line1: profile.data.address_line1 ?? "",
        city: profile.data.city ?? "",
        state: profile.data.state ?? "",
        pincode: profile.data.pincode ?? "",
        phone: profile.data.phone ?? "",
      });
    }
  }, [profile.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["center-students", centerId] });
    void qc.invalidateQueries({ queryKey: ["center-student-program", centerId, student.id] });
    onSaved?.();
  };

  const savePortalCredentials = useMutation({
    mutationFn: async () => {
      if (!loginEmail.trim()) throw new Error("Enter login email");
      clear();
      const alreadyProvisioned = Boolean(student.user_id);
      const result = await upsertStudentPortalCredentials({
        studentId: student.id,
        centerId,
        brandId,
        email: loginEmail,
        password,
        fullName: student.full_name,
        alreadyProvisioned,
      });
      if (result.error) throw new Error(result.error);
      return { ...result, submittedPassword: password.trim() };
    },
    onSuccess: (result) => {
      portalSaved.flash();
      if (result.passwordWasSet && result.submittedPassword) {
        setPasswordNotice(result.submittedPassword);
        setSaveMessage("Portal login saved. Share the password with the student now — it is shown once below.");
      } else {
        setPasswordNotice(null);
        setSaveMessage("Portal login saved.");
      }
      setPassword("");
      invalidate();
    },
    onError: capture,
  });

  const saveAddress = useMutation({
    mutationFn: async () => {
      clear();
      await upsertStudentDeliveryAddress(brandId, student.id, address);
    },
    onSuccess: () => {
      addressSaved.flash();
      void qc.invalidateQueries({ queryKey: ["student-profile-address", student.id] });
    },
    onError: capture,
  });

  const saveProgram = useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error("Select a course / program");
      if (!levelId) throw new Error("Select the starting level");
      clear();
      await pinEnrollmentProgram(student.enrollment_id, programId, levelId);
    },
    onSuccess: () => {
      setSaveMessage("Course and starting level assigned.");
      invalidate();
    },
    onError: capture,
  });

  const saveBatches = useMutation({
    mutationFn: async () => {
      clear();
      await syncStudentBatchAssignments(student.id, centerId, selectedBatches);
    },
    onSuccess: () => {
      setSaveMessage("Batch assignments updated.");
      invalidate();
    },
    onError: capture,
  });

  const toggleBatch = (batchId: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  async function copyProfileUrl() {
    const slug = tenant.brandSlug?.trim();
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(studentProfileLoginUrl(slug, tenant.centerSlug));
      void reportAccessAudit({
        action: "view_pii",
        resourceType: "student_profile_url",
        resourceId: student.id,
        tenant,
        path: "/app/students",
      });
      setCopiedProfileUrl(true);
      window.setTimeout(() => setCopiedProfileUrl(false), 2000);
    } catch {
      setCopiedProfileUrl(false);
    }
  }

  const portalLinked = !!student.user_id;
  const currentLevel = programContext.data?.current_level_name;
  const assignmentChanged =
    programId !== (student.program_id ?? "") || levelId !== (student.starting_level_id ?? "");
  const openBatchSlots = (batches.data ?? []).filter((b) => b.is_open_for_enrollment).length;

  return (
    <div className="ed-ops-detail-enter">
      <MutationError message={error} />
      {saveMessage ? (
        <p className="ed-text-sm ed-success" role="status" aria-live="polite">
          {saveMessage}
        </p>
      ) : null}

      <header className="ed-ops-detail-hero">
        <div className="ed-ops-detail-hero__main">
          <span className="ed-ops-detail-hero__avatar" aria-hidden>
            {initialsFromName(student.full_name)}
          </span>
          <div>
            <h2 className="ed-ops-detail-hero__name">{student.full_name}</h2>
            <p className="ed-ops-detail-hero__status">
              <span className="ed-ops-detail-hero__status-dot" aria-hidden />
              Active enrollment
            </p>
            <p className="ed-ops-detail-hero__meta">
              ID: {student.student_code ?? student.id.slice(0, 8).toUpperCase()} · Joined:{" "}
              {formatJoined(student.enrollment_created_at)}
            </p>
          </div>
        </div>
      </header>

      <div className="ed-ops-detail-tabs" role="tablist" aria-label="Student detail sections">
        <button
          type="button"
          role="tab"
          className={`ed-ops-detail-tabs__btn${activeTab === "enrollment" ? " is-active" : ""}`}
          aria-selected={activeTab === "enrollment"}
          onClick={() => setActiveTab("enrollment")}
        >
          Enrollment
        </button>
        <button
          type="button"
          role="tab"
          className={`ed-ops-detail-tabs__btn${activeTab === "assessments" ? " is-active" : ""}`}
          aria-selected={activeTab === "assessments"}
          onClick={() => setActiveTab("assessments")}
        >
          {ICON_CLIPBOARD}
          Assessments
        </button>
      </div>

      {activeTab === "assessments" ? (
        <CenterStudentAssessmentPanel
          student={student}
          centerId={centerId}
          embedded
          onSaved={onSaved}
        />
      ) : (
        <>
      <div className="ed-ops-detail-grid">
        <OpsSectionCard
          icon={ICON_GRAD}
          title="Course / program"
          description="Assign the course and the starting level. Progress is tracked automatically."
          footer={
            student.program_name
              ? `Currently assigned: ${student.program_name}${student.starting_level_name ? ` • ${student.starting_level_name}` : ""}${
                  currentLevel && currentLevel !== student.starting_level_name ? ` · now on ${currentLevel}` : ""
                }`
              : undefined
          }
        >
          <FormGrid columns={2}>
            <Select
              label="Program"
              value={programId}
              onChange={setProgramId}
              options={[
                { value: "", label: "Select program…" },
                ...(programs.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
              editable
            />
            <Select
              label="Starting level"
              value={levelId}
              onChange={setLevelId}
              options={[
                { value: "", label: programId ? "Select level…" : "Choose program first" },
                ...(programLevels.data ?? []).map((l) => ({
                  value: l.id,
                  label: l.abacus_level_code ? `${l.name} (${l.abacus_level_code})` : l.name,
                })),
              ]}
              editable
            />
          </FormGrid>
          <FormActions>
            <Button
              onClick={() => saveProgram.mutate()}
              disabled={saveProgram.isPending || !programId || !levelId || !assignmentChanged}
            >
              Update assignment
            </Button>
          </FormActions>
        </OpsSectionCard>

        <OpsSectionCard
          icon={ICON_KEY}
          title="Portal access"
          description="Set the student learn-portal email and password, then share the login URL."
        >
          <FormGrid columns={2}>
            <Input label="Login email" value={loginEmail} onChange={setLoginEmail} editable type="email" />
            <PasswordInput
              label={portalLinked ? "New password (optional)" : "Password"}
              value={password}
              onChange={setPassword}
              placeholder={
                portalLinked ? "Leave blank to keep current password" : "Required for new login"
              }
            />
          </FormGrid>
          <p className="ed-text-sm ed-muted">{studentPortalPasswordHint(portalLinked)}</p>
          {portalLinked ? (
            <div className="ed-ops-linked-banner">
              <span aria-hidden>✓</span>
              LINKED TO LOGIN · Student can sign in on the learn portal
            </div>
          ) : null}
          {passwordNotice ? (
            <p className="ed-text-sm" role="status">
              Password to share: <code>{passwordNotice}</code>
            </p>
          ) : null}
          <FormActions>
            <SaveButton
              onClick={() => savePortalCredentials.mutate()}
              disabled={savePortalCredentials.isPending || !loginEmail.trim()}
              pending={savePortalCredentials.isPending}
              saved={portalSaved.saved}
              label={portalLinked ? "Update portal login" : "Activate portal login"}
            />
            <Button
              variant="ghost"
              onClick={() => {
                void copyProfileUrl();
              }}
              disabled={!tenant.brandSlug?.trim()}
            >
              {copiedProfileUrl ? "Copied" : "Copy Profile URL"}
            </Button>
          </FormActions>
        </OpsSectionCard>
      </div>

      {batchesEnabled ? (
        <OpsSectionCard
          icon={ICON_USERS}
          title="Batch assignments"
          footer={`Slots available: ${openBatchSlots}`}
        >
          {(batches.data ?? []).map((batch) => (
            <div key={batch.id} className="ed-ops-batch-row">
              <div>
                <p className="ed-ops-batch-row__name">
                  {batch.name}
                  {batch.is_open_for_enrollment ? " (open)" : ""}
                </p>
                <p className="ed-ops-batch-row__meta">{formatBatchSchedule(batch)}</p>
              </div>
              <ToggleField
                label={`Assign ${batch.name}`}
                checked={selectedBatches.includes(batch.id)}
                onChange={() => toggleBatch(batch.id)}
              />
            </div>
          ))}
          {(batches.data ?? []).length === 0 ? (
            <p className="ed-text-sm ed-muted">Create batches first to assign this student.</p>
          ) : null}
          <FormActions>
            <Button onClick={() => saveBatches.mutate()} disabled={saveBatches.isPending}>
              Save batches
            </Button>
          </FormActions>
        </OpsSectionCard>
      ) : null}

      <OpsSectionCard icon={ICON_KEY} title="Delivery address" description="Used for kit and merchandise shipping.">
        <FormGrid columns={2}>
          <Input
            label="Address"
            value={address.address_line1}
            onChange={(v) => setAddress((a) => ({ ...a, address_line1: v }))}
            editable
          />
          <Input label="City" value={address.city} onChange={(v) => setAddress((a) => ({ ...a, city: v }))} editable />
          <Input label="State" value={address.state} onChange={(v) => setAddress((a) => ({ ...a, state: v }))} editable />
          <Input
            label="Pincode"
            value={address.pincode}
            onChange={(v) => setAddress((a) => ({ ...a, pincode: v }))}
            editable
          />
          <Input label="Phone" type="tel" value={address.phone} onChange={(v) => setAddress((a) => ({ ...a, phone: v }))} editable />
        </FormGrid>
        <FormActions>
          <SaveButton
            onClick={() => saveAddress.mutate()}
            pending={saveAddress.isPending}
            saved={addressSaved.saved}
            label="Save address"
          />
          {addressSaved.saved ? (
            <p className="ed-ops-save-status" role="status" aria-live="polite">
              Address saved.
            </p>
          ) : null}
        </FormActions>
      </OpsSectionCard>
        </>
      )}
    </div>
  );
}
