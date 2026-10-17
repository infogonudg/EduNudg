import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  CentersDirectoryItem,
  CentersDirectoryPanel,
  CentersKpiCard,
  CentersKpiGrid,
  CentersMobileOverview,
  CentersPageHeader,
  CentersSearchField,
} from "@edunudg/ui";
import { useBrandScope } from "@/features/brand/hooks/useBrandScope";
import { useTenant } from "@/bootstrap/TenantProvider";
import { reportAccessAudit } from "@/services/auth/accessAuditApi";
import { BrandStudentDetailPanel } from "@/features/brand/students/BrandStudentDetailPanel";
import {
  downloadBrandStudentsCsv,
  filterBrandStudents,
  studentAvatarTone,
  studentDirectoryMeta,
  studentInitials,
  studentPageCounts,
  studentStatusLabel,
  studentStatusTone,
  type BrandStudentFilter,
} from "@/features/brand/students/brandStudentsHelpers";
import { fetchBrandStudents } from "@/lib/brandStudentsApi";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import "@/features/brand/centers/brandCenters.css";

const KPI_ICONS = {
  total: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  linked: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  unassigned: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

export function BrandStudentsView() {
  const tenant = useTenant();
  const { brandId, brandSlug, missingBrand } = useBrandScope();
  const { isMobile } = useOpsBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<BrandStudentFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const studentsQuery = useQuery({
    queryKey: ["brand-students", brandId],
    enabled: !!brandId,
    queryFn: () => fetchBrandStudents(brandId!),
  });

  const all = studentsQuery.data ?? [];

  useEffect(() => {
    const studentId = searchParams.get("student")?.trim();
    if (!studentId || all.length === 0) return;
    const match = all.find((row) => row.id === studentId);
    if (match) {
      setSelectedKey(match.enrollment_id);
      if (isMobile) setMobileDetailOpen(true);
    }
  }, [searchParams, all, isMobile]);

  const counts = useMemo(() => studentPageCounts(all), [all]);
  const filtered = useMemo(() => filterBrandStudents(all, filter, search), [all, filter, search]);
  const selected = all.find((row) => row.enrollment_id === selectedKey) ?? null;

  const selectStudent = (enrollmentId: string) => {
    setSelectedKey(enrollmentId);
    const row = all.find((item) => item.enrollment_id === enrollmentId);
    if (row) {
      setSearchParams({ student: row.id }, { replace: true });
      if (isMobile) setMobileDetailOpen(true);
    }
  };

  const closeDetail = () => {
    setSelectedKey(null);
    setMobileDetailOpen(false);
    setSearchParams({}, { replace: true });
  };

  if (missingBrand || !brandId) {
    return <p className="ed-empty">Brand context not found. Check domain mapping for this hostname.</p>;
  }

  const directory = (
    <CentersDirectoryPanel title="Directory">
      {filtered.length === 0 ? (
        <p className="ed-text-sm ed-muted ed-brand-centers__empty">No students in this view.</p>
      ) : (
        filtered.map((student, index) => (
          <CentersDirectoryItem
            key={student.enrollment_id}
            initials={studentInitials(student)}
            imageUrl={student.photo_url}
            tone={studentAvatarTone(index)}
            title={student.full_name}
            meta={studentDirectoryMeta(student)}
            status={studentStatusTone(student)}
            statusLabel={studentStatusLabel(student)}
            selected={student.enrollment_id === selectedKey}
            onSelect={() => selectStudent(student.enrollment_id)}
          />
        ))
      )}
    </CentersDirectoryPanel>
  );

  const detailPanel = selected ? (
    <BrandStudentDetailPanel student={selected} isMobile={isMobile} />
  ) : (
    <div className="ed-brand-centers__placeholder">
      <p className="ed-text-sm ed-muted">
        Select a student to view contact details, franchise, and current curriculum levels.
      </p>
    </div>
  );

  return (
    <div className={`ed-brand-centers${isMobile ? " ed-brand-centers--mobile" : ""}`}>
      <CentersPageHeader
        title="Students"
        subtitle="See every enrolled student across franchises, with contact details and curriculum progress."
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={all.length === 0}
            onClick={() => {
              void reportAccessAudit({
                action: "export",
                resourceType: "students_csv",
                tenant,
                path: "/app/students",
                metadata: { rowCount: all.length },
              });
              downloadBrandStudentsCsv(all, brandSlug ?? "");
            }}
          >
            Export CSV
          </Button>
        }
      />

      {isMobile ? (
        <CentersMobileOverview
          items={[
            { key: "all", label: "All", value: counts.total, tone: "default" },
            { key: "linked", label: "Linked", value: counts.linked, tone: "active" },
            { key: "unassigned", label: "Unassigned", value: counts.unassigned, tone: "suspended" },
          ]}
        />
      ) : (
        <CentersKpiGrid>
          <CentersKpiCard
            label="Total Students"
            value={counts.total}
            icon={KPI_ICONS.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <CentersKpiCard
            label="Linked"
            value={counts.linked}
            icon={KPI_ICONS.linked}
            tone="active"
            active={filter === "linked"}
            onClick={() => setFilter("linked")}
          />
          <CentersKpiCard
            label="Unassigned"
            value={counts.unassigned}
            icon={KPI_ICONS.unassigned}
            tone="suspended"
            active={filter === "unassigned"}
            onClick={() => setFilter("unassigned")}
          />
        </CentersKpiGrid>
      )}

      <CentersSearchField
        value={search}
        onChange={setSearch}
        placeholder="Search by student, franchise, or city…"
      />

      {isMobile ? (
        <>
          {directory}
          {!mobileDetailOpen ? (
            <p className="ed-text-sm ed-muted ed-brand-centers__hint">Tap a student to open details.</p>
          ) : null}
        </>
      ) : (
        <div className="ed-brand-centers__layout">
          {directory}
          <div className="ed-brand-centers__main">{detailPanel}</div>
        </div>
      )}

      {isMobile && mobileDetailOpen && selected ? (
        <div className="ed-ops-mobile-detail" role="dialog" aria-modal aria-label="Student details">
          <div className="ed-ops-mobile-detail__bar">
            <button type="button" className="ed-ops-mobile-detail__back" onClick={closeDetail}>
              ← Back
            </button>
          </div>
          {detailPanel}
        </div>
      ) : null}
    </div>
  );
}
