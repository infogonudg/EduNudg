import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FilterTabs,
  LeadKpiCard,
  LeadKpiGrid,
  MutationError,
  PipelinePageHeader,
  PipelineWorkspace,
} from "@edunudg/ui";
import { ManualStudentLeadCard } from "@/features/shared/manualLeads/ManualStudentLeadCard";
import { getSupabase } from "@/lib/supabase";
import { supabaseList } from "@/lib/supabaseResult";
import { isLeadStale } from "@/lib/leadSla";
import {
  assignLeadToCenter,
  listBrandLeads,
  reopenLead,
  reassignLead,
  suggestCentersForLead,
  type LeadRow,
} from "@/lib/leadsApi";
import { useMutationError } from "@/features/platform/hooks/useMutationError";
import { useOpsBreakpoint } from "@/features/center/hooks/useOpsBreakpoint";
import { StudentLeadDetailView } from "@/features/brand/studentLeads/StudentLeadDetailView";
import {
  downloadLeadsCsv,
  filterLeads,
  formatLeadListDate,
  formatLeadRelativeWhen,
  isConvertedLead,
  LEAD_FILTER_OPTIONS,
  leadAvatarTone,
  leadCounts,
  leadInboxStatusPresentation,
  leadInitials,
  leadListLocation,
  leadListTitle,
  leadMobileLocation,
  sortLeads,
  type LeadFilter,
} from "@/features/brand/studentLeads/studentLeadsHelpers";
import { useTenant } from "@/bootstrap/TenantProvider";
import { reportAccessAudit } from "@/services/auth/accessAuditApi";
import "./studentLeads.css";

const ICON_SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ICON_PIN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

function StatusBadge({ label, tone }: ReturnType<typeof leadInboxStatusPresentation>) {
  return <span className={`ed-franchise-app-status-badge ed-franchise-app-status-badge--${tone}`}>{label}</span>;
}

export function StudentLeadsView({ brandId }: { brandId: string }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const { error, clear, capture } = useMutationError();
  const { isDesktop, isMobile } = useOpsBreakpoint();
  const [filter, setFilter] = useState<LeadFilter>("pending");
  /** Converted and Lost both open Decided, so the highlighted card is tracked separately. */
  const [stat, setStat] = useState<"pending" | "converted" | "lost" | "all" | "decided">("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState(false);
  const [isReallocate, setIsReallocate] = useState(false);
  const [assignCenterId, setAssignCenterId] = useState("");
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const leads = useQuery({
    queryKey: ["brand-leads", brandId],
    queryFn: () => listBrandLeads(brandId),
  });

  const centers = useQuery({
    queryKey: ["centers", brandId],
    queryFn: async () => {
      const { data, error: qErr } = await getSupabase()
        .from("franchise_centers")
        .select("id, name, display_name, slug, pincode, city, address_line1")
        .eq("brand_id", brandId)
        .is("deleted_at", null)
        .order("name");
      return supabaseList(data, qErr) as {
        id: string;
        name: string;
        display_name: string | null;
        slug: string;
        pincode: string | null;
        city: string | null;
        address_line1: string | null;
      }[];
    },
  });

  const allLeads = leads.data ?? [];
  const now = Date.now();
  const counts = useMemo(() => leadCounts(allLeads, now), [allLeads, now]);
  const filtered = useMemo(() => {
    if (stat === "all" && !search.trim()) return sortLeads(allLeads, "newest");
    const bucket: LeadFilter =
      stat === "converted" || stat === "lost" || stat === "decided" ? "decided" : filter;
    const base = sortLeads(filterLeads(allLeads, bucket, now, search), "newest");
    if (search.trim()) return base;
    if (stat === "converted") return base.filter((lead) => isConvertedLead(lead));
    if (stat === "lost") return base.filter((lead) => lead.status === "lost");
    return base;
  }, [allLeads, filter, now, search, stat]);
  const selected = allLeads.find((row) => row.id === selectedId) ?? null;

  const suggestions = useQuery({
    queryKey: ["lead-suggestions", selectedId],
    enabled: !!selectedId && (assignMode || !isMobile),
    queryFn: () => suggestCentersForLead(selectedId!),
  });

  const centerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const center of centers.data ?? []) {
      map.set(center.id, center.display_name ?? center.name);
    }
    return map;
  }, [centers.data]);

  const resetAssignState = () => {
    setAssignMode(false);
    setIsReallocate(false);
    setAssignCenterId("");
  };

  const closeDetail = () => {
    setSelectedId(null);
    resetAssignState();
  };

  const selectLead = (id: string) => {
    setSelectedId(id);
    resetAssignState();
  };

  useEffect(() => {
    if (selectedId && !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(null);
      resetAssignState();
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedId || filtered.length === 0 || !isDesktop) return;
    setSelectedId(filtered[0]!.id);
  }, [filtered, selectedId, isDesktop]);

  const assign = useMutation({
    mutationFn: async () => {
      if (!selectedId || !assignCenterId) return;
      clear();
      if (selected?.center_id) await reassignLead(selectedId, assignCenterId);
      else await assignLeadToCenter(selectedId, assignCenterId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brand-leads", brandId] });
      void qc.invalidateQueries({ queryKey: ["brand-dashboard", brandId] });
      void qc.invalidateQueries({ queryKey: ["shell-context-counts"] });
      closeDetail();
    },
    onError: capture,
  });

  const reopen = useMutation({
    mutationFn: async (leadId: string) => {
      clear();
      await reopenLead(leadId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brand-leads", brandId] });
      void qc.invalidateQueries({ queryKey: ["brand-dashboard", brandId] });
      void qc.invalidateQueries({ queryKey: ["shell-context-counts"] });
      closeDetail();
    },
    onError: capture,
  });

  const selectedStale = selected ? isLeadStale(selected, now) : false;
  const selectedUnassigned =
    selected && !selected.center_id && selected.status !== "lost" && selected.status !== "converted";

  const filterTabs = LEAD_FILTER_OPTIONS.map((option) => ({
    value: option.value,
    label: isMobile ? option.mobileLabel : option.label,
    count: counts[option.value],
  }));

  const listEmpty = (
    <div className="ed-franchise-apps-page__empty">
      <p>No student leads in this view.</p>
      {filter !== "pending" ? (
        <Button
          variant="ghost"
          onClick={() => {
            setFilter("pending");
            setStat("pending");
          }}
        >
          Show pending review
        </Button>
      ) : null}
    </div>
  );

  const renderDesktopList = () => {
    if (leads.isLoading) return <p className="ed-text-sm ed-muted">Loading leads…</p>;
    if (filtered.length === 0) return listEmpty;

    return (
      <div className="ed-franchise-apps-page__desktop-list">
        {filtered.map((lead) => {
          const title = leadListTitle(lead);
          const status = leadInboxStatusPresentation(lead, now);
          const location = leadListLocation(lead);

          return (
            <button
              key={lead.id}
              type="button"
              className={`ed-franchise-app-list-item${lead.id === selectedId ? " ed-franchise-app-list-item--selected" : ""}`}
              onClick={() => selectLead(lead.id)}
            >
              <div className="ed-franchise-app-list-item__head">
                <StatusBadge {...status} />
                <span className="ed-franchise-app-list-item__when">{formatLeadRelativeWhen(lead.created_at, now)}</span>
              </div>
              <p className="ed-franchise-app-list-item__title">{title}</p>
              {location ? (
                <p className="ed-franchise-app-list-item__location">
                  {ICON_PIN}
                  {location}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMobileList = () => {
    if (leads.isLoading) return <p className="ed-text-sm ed-muted">Loading leads…</p>;
    if (filtered.length === 0) return listEmpty;

    return (
      <div className="ed-franchise-apps-page__mobile-list">
        {filtered.map((lead) => {
          const title = leadListTitle(lead);
          const status = leadInboxStatusPresentation(lead, now);
          const location = leadMobileLocation(lead);
          const avatarTone = leadAvatarTone(lead.id);

          return (
            <button
              key={lead.id}
              type="button"
              className="ed-franchise-app-mobile-card"
              onClick={() => selectLead(lead.id)}
            >
              <div className="ed-franchise-app-mobile-card__head">
                <span className={`ed-franchise-app-mobile-card__avatar ed-franchise-app-mobile-card__avatar--${avatarTone}`}>
                  {leadInitials(lead)}
                </span>
                <div>
                  <div className="ed-franchise-app-mobile-card__title-row">
                    <h3 className="ed-franchise-app-mobile-card__title">{title}</h3>
                    {status.tone === "new" ? <StatusBadge {...status} /> : null}
                  </div>
                  {location ? (
                    <p className="ed-franchise-app-mobile-card__location">
                      {ICON_PIN}
                      {location}
                    </p>
                  ) : null}
                </div>
                <span className="ed-franchise-app-mobile-card__date">{formatLeadListDate(lead.created_at)}</span>
              </div>
              <div className="ed-franchise-app-mobile-card__footer">
                <span className="ed-franchise-app-mobile-card__cta">View Details &gt;</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const detailView = selected ? (
    <StudentLeadDetailView
      lead={selected}
      isMobile={isMobile}
      assignedCenterName={selected.center_id ? centerNameById.get(selected.center_id) : undefined}
      stale={selectedStale}
      unassigned={!!selectedUnassigned}
      assignMode={assignMode}
      isReallocate={isReallocate}
      assignCenterId={assignCenterId}
      onAssignCenterIdChange={setAssignCenterId}
      exactSuggestions={suggestions.data?.exact ?? []}
      nearSuggestions={suggestions.data?.near ?? []}
      centers={centers.data ?? []}
      assignPending={assign.isPending}
      reopenPending={reopen.isPending}
      onBack={closeDetail}
      onStartAssign={(reallocate) => {
        setAssignMode(true);
        setIsReallocate(reallocate);
        setAssignCenterId((prev) => prev || selected.center_id || "");
      }}
      onCancelAssign={resetAssignState}
      onConfirmAssign={() => assign.mutate()}
      onReopen={() => reopen.mutate(selected.id)}
    />
  ) : null;

  return (
    <div className={`ed-franchise-apps-page ed-student-leads${selected ? " ed-franchise-apps-page--detail-open" : ""}`}>
      <PipelinePageHeader
        title="Student Leads"
        subtitle="Manage parent inquiries and track conversion pipeline."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                void reportAccessAudit({
                  action: "export",
                  resourceType: "leads_csv",
                  tenant,
                  path: "/app/leads",
                  metadata: { rowCount: allLeads.length },
                });
                downloadLeadsCsv(allLeads);
              }}
            >
              Export List
            </Button>
            <Button onClick={() => setAddLeadOpen(true)}>+ New Lead</Button>
          </>
        }
      />
      <MutationError message={error} />

      <LeadKpiGrid>
        <LeadKpiCard
          label="Pending review"
          value={counts.pending}
          hint={counts.pending > 0 ? "In queue" : undefined}
          active={stat === "pending"}
          onClick={() => {
            setStat("pending");
            setFilter("pending");
          }}
        />
        <LeadKpiCard
          label="Converted"
          value={counts.converted}
          hint="Enrolled"
          active={stat === "converted"}
          onClick={() => {
            setStat("converted");
            setFilter("decided");
          }}
        />
        <LeadKpiCard
          label="Lost"
          value={counts.lost}
          tone="lost"
          active={stat === "lost"}
          onClick={() => {
            setStat("lost");
            setFilter("decided");
          }}
        />
        <LeadKpiCard
          label={isMobile ? "All leads" : "Total"}
          value={counts.all}
          hint="All leads"
          tone="total"
          active={stat === "all"}
          onClick={() => setStat("all")}
        />
      </LeadKpiGrid>

      <div className="ed-franchise-apps-page__toolbar">
        <label className="ed-franchise-apps-page__search">
          <span className="ed-franchise-apps-page__search-icon">{ICON_SEARCH}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads..."
            aria-label="Search leads"
          />
        </label>
        <FilterTabs
          options={filterTabs}
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setStat(next === "pending" ? "pending" : "decided");
          }}
          aria-label="Lead filter"
        />
      </div>

      <PipelineWorkspace
        detailOpen={!!selected}
        list={
          <>
            {isDesktop ? renderDesktopList() : null}
            {isMobile ? renderMobileList() : null}
          </>
        }
        detail={
          detailView ??
          (isDesktop ? (
            <div className="ed-franchise-apps-page__placeholder">
              <p className="ed-text-sm ed-muted">
                Select a parent lead to review details and assign to a center.
              </p>
            </div>
          ) : null)
        }
      />

      <ManualStudentLeadCard
        scope="brand"
        brandId={brandId}
        invalidateKey={["brand-leads", brandId]}
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
      />

      {isMobile && !selected && !addLeadOpen ? (
        <button
          type="button"
          className="ed-franchise-apps-page__fab"
          aria-label="New Lead"
          onClick={() => setAddLeadOpen(true)}
        >
          +
        </button>
      ) : null}
    </div>
  );
}
